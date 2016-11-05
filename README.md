node-m17n
===

[![Join the chat at https://gitter.im/shimataro/node-m17n](https://badges.gitter.im/shimataro/node-m17n.svg)](https://gitter.im/shimataro/node-m17n?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

multilingualization module for Node.js server

## How to use

init phase:
```javascript
var path = require("path");
var m17n = require("node-m17n");

// specify m17n directories and fallback language
// * dirLanguages and dirRegions are NOT required.
// * If omitted, default directories in node-m17n will be used.
m17n.configure({
	dirLanguages: path.resolve("languages"),
	dirRegions: path.resolve("regions"),
	dirMessages: path.resolve("messages"),
	fallback: "ja-jp"
});
```

request phase:
```javascript
var m = m17n({
	acceptLanguage: "ja,en-US;q=0.8,en;q=0.7,pl;q=0.5,pt-BR;q=0.3,de;q=0.2",
});

console.log("currency: " + m.region.currency);
console.log("language direction: " + m.lang.dir);
console.log("i18n: " + m._.i18n());
console.log("replacement: " + m._.message.to.be.replaced({
    aaa: "{bbb}",
    bbb: "{ccc}",
    ccc: "{aaa}",
}));
```
