const utils = {
    /**
     * @name transformString
     * @description [descripción de la funcion]
     * @return {void}
     */
    transformString: function (str) {
        const regex = /^[A-Z]+|[^A-Z]*[A-Z]/g;

        const matches = str.match(regex);

        if (matches) {
            if (matches[0].length == 1) {
                return str;
            } else {
                let start = matches[0];
                str = str.replace(start, '');
                let letters = start.split('');
                let last = letters.pop();
                let text = letters.join('').toLowerCase() + last + str;

                return text;
            }
        }
        return str;
    },

    /**
     * @name getRandomNumber
     * @description retun a number between 1 - 20
     * @return {void}
     */
    getRandomNumber: function () {
        return Math.floor(Math.random() * 20) + 1;
    },

    /**
     * @name addIndefiniteArticle
     * @description evaluate a word and determine if it require add an indefinite article a or an
     * @return {void}
     */
    addIndefiniteArticle: function (word) {
        const vowels = ['a', 'e', 'i', 'o', 'u'];
        const firstLetter = word[0].toLowerCase();

        if (vowels.includes(firstLetter)) {
            return 'an-' + word;
        } else {
            return 'a-' + word;
        }
    },
};
module.exports = utils;
