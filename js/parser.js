// ===== DOCUMENT PARSING =====
// Extracts cards from PDF, DOCX, TXT, Markdown files
// Uses global libs: pdfjsLib, mammoth, marked

import { generateId } from './utils.js';

// Ensure PDF.js worker is configured
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export async function parseFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const category = file.name.replace(/\.[^/.]+$/, '');

    try {
        let cards = [];
        if (extension === 'pdf') cards = await parsePdf(file, category);
        else if (extension === 'docx') cards = await parseDocx(file, category);
        else if (extension === 'txt') cards = await parseTxt(file, category);
        else if (extension === 'md') cards = await parseMd(file, category);
        else throw new Error(`Unsupported file type: .${extension}`);

        return { cards, category };
    } catch (error) {
        console.error('Error parsing file:', error);
        return { cards: [], category, error: error.message };
    }
}

async function parsePdf(file, category) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let text = '';

    for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
    }

    return extractCardsFromText(text, category);
}

async function parseDocx(file, category) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const cards = [];
    let currentTitle = 'Untitled';
    let currentContent = '';

    const elements = doc.body.children;
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const tagName = el.tagName.toLowerCase();

        if (['h1', 'h2', 'h3'].includes(tagName)) {
            if (currentTitle !== 'Untitled' && currentContent.trim()) {
                cards.push(createCard(currentTitle, currentContent, category));
            }
            currentTitle = el.textContent.trim();
            currentContent = '';
        } else if (tagName === 'p' || tagName === 'ul' || tagName === 'ol') {
            currentContent += el.innerHTML + '<br>';
        }
    }

    if (currentTitle !== 'Untitled' && currentContent.trim()) {
        cards.push(createCard(currentTitle, currentContent, category));
    }

    return cards.length > 0 ? cards : [createCard('Card 1', html, category)];
}

async function parseTxt(file, category) {
    const text = await file.text();
    return extractCardsFromText(text, category);
}

async function parseMd(file, category) {
    const text = await file.text();
    const html = marked.parse(text);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const cards = [];
    let currentTitle = 'Untitled';
    let currentContent = '';

    const elements = doc.body.children;
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const tagName = el.tagName.toLowerCase();

        if (tagName.match(/^h[1-6]$/)) {
            if (currentTitle !== 'Untitled' && currentContent.trim()) {
                cards.push(createCard(currentTitle, currentContent, category));
            }
            currentTitle = el.textContent.trim();
            currentContent = '';
        } else {
            currentContent += el.outerHTML + '<br>';
        }
    }

    if (currentTitle !== 'Untitled' && currentContent.trim()) {
        cards.push(createCard(currentTitle, currentContent, category));
    }

    return cards.length > 0 ? cards : [createCard('Card 1', html, category)];
}

function extractCardsFromText(text, category) {
    const lines = text.split('\n').filter(line => line.trim());
    const cards = [];
    let currentTitle = '';
    let currentContent = '';

    const headingPatterns = [
        /^[A-Z]{3,}.*$/,
        /^(Q|Q\d+|Chapter|Section|\d+\.|Lesson):/i,
        /^#+\s/
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const isHeading = headingPatterns.some(p => p.test(line)) ||
            (line.length < 80 && i < lines.length - 1);

        if (isHeading && currentTitle) {
            if (currentContent.trim()) {
                cards.push(createCard(currentTitle, currentContent, category));
            }
            currentTitle = line.replace(/^#+\s/, '');
            currentContent = '';
        } else if (isHeading) {
            currentTitle = line.replace(/^#+\s/, '');
        } else {
            currentContent += line + '\n';
        }
    }

    if (currentTitle && currentContent.trim()) {
        cards.push(createCard(currentTitle, currentContent, category));
    }

    if (cards.length === 0 && text.trim()) {
        cards.push(createCard('Content', text, category));
    }

    return cards;
}

function createCard(title, content, category) {
    return {
        id: generateId(),
        title: title.substring(0, 200),
        hint: content.substring(0, 150).replace(/<[^>]*>/g, ''),
        content: content,
        category: category,
        created: new Date().toISOString()
    };
}
