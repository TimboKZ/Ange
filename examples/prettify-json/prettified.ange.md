# Ange example: Printing JSON content

The contents of `my-json.json` can be seen below. Note that the output is prettified - even if you change the whitespace
in the original file, the output below will remain the same.

```json
<%- JSON.stringify(require('./my-json.json'), null, 2) %>
```
