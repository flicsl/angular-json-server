module.exports = {
    "extends": "google",
    "globals": {
        "angular": true,
        "chai": true,
        "sinon": true,
        "inject": true,
        "expect": true,
    },
    "rules": {
        'max-len': [1, 110, 4, {
            ignoreComments: true,
            ignoreUrls: true
        }],
        "indent": [
            2,
            "tab"
        ],
        "quotes": [
            2,
            "double"
        ],
        "linebreak-style": [
            2,
            "unix"
        ],
        "semi": [
            2,
            "always"
        ],
        "no-console": 0,
        "no-unused-expressions": 0
    },
    "env": {
        "browser": true,
        "mocha": true
    }
};
