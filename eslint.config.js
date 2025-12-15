export default [
    {
        files: ["assets/js/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                window: "readonly",
                document: "readonly",
                console: "readonly",
                localStorage: "readonly",
                performance: "readonly",
                requestAnimationFrame: "readonly",
                setTimeout: "readonly",
                setInterval: "readonly",
                clearTimeout: "readonly",
                clearInterval: "readonly",
                AudioContext: "readonly",
                OscillatorNode: "readonly",
                getComputedStyle: "readonly",
            }
        },
        rules: {
            "complexity": ["warn", 10],
            "max-depth": ["warn", 4],
            "max-params": ["warn", 5],
            "max-lines": ["warn", 400],
        }
    }
];

