
const BAD_WORDS = [
    'badword', 'swear', 'spam', 'abuse', // Add more as needed or load from a JSON file
    'damn', 'hell', 'ass', 'fck', 'shit', 'bitch'
];

class ProfanityFilter {
    constructor() {
        this.list = BAD_WORDS;
    }

    isProfane(text) {
        if (!text) return false;
        const lower = text.toLowerCase();
        return this.list.some(word => lower.includes(word));
    }

    clean(text) {
        if (!text) return '';
        let cleaned = text;
        this.list.forEach(word => {
            const regex = new RegExp(word, 'gi');
            cleaned = cleaned.replace(regex, '*'.repeat(word.length));
        });
        return cleaned;
    }
}

module.exports = ProfanityFilter;
