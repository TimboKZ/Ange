# Ange

Compile anything into anything using [EJS templates](http://ejs.co/).

> This project is currently in development.

# Philosophy

There are times when you want to automate some part of text (or documentation) generation, but that part is either too
specific or too small to justify using tools like [apiDoc](http://apidocjs.com/) or [JSDoc](https://github.com/jsdoc3/jsdoc).
Ange addresses this exact issue - it lets you insert small JavaScript snippets into any  text file using the
[EJS templating engine](http://ejs.co/). These snippets will then be evaluated to print out the final result - letting
you automatically generate content for text files.

Ange doesn't stop at documentation - it works with any text file format. You can use it for anything you want - for
example, you can use Ange to generate a config file for continuous integration (using Ange to print environment
variables into the config).

Ange was meant to be very simple to use - it requires no configuration and uses
[default EJS syntax](http://ejs.co/#docs), yet it is still a very powerful tool. That said, if you're working on a large
project that requires complex compilation logic, you should probably go for a real documentation/static site generator.

# Usage

Make sure you have [Node.js v6+](https://nodejs.org/) installed. Below you can see an example command line workflow for
Ange. You can view help using the `ange help` command.

```bash
# Install Ange globally
npm install -g ange

# Create a new folder
mkdir ange-demo
cd ange-demo

# Create a template file for Ange
echo 'Current date is <%- new Date().toLocaleDateString() %>.' > date.ange.txt
# The command above will create the file `date.ange.txt`

# Compile the template - Ange will automatically discover it
ange
# `date.ange.txt` -> `data.txt`

# View the contents of the generated file
cat date.txt

# You can also use Glob patterns:
ange './**/*.ange.txt'

# Add `-w` or `--watch` flag to watch files for changes
ange './**/*.ange.txt' -w
```

You can run `ange` on a single file (`ange my-file.txt`) or on a directory (`ange my-folder/`). Running `ange` without
any arguments will make it use the current directory. If you want Ange to scan folder recursively, you need to use the
`-r` flag.

### EJS templates

The basic idea is that you first need to create a template file that has
`.ange` in its name. For example: `api-docs.ange.md`, `style.ange.css`,
`config.ange.ini`, etc. You can use [EJS syntax](http://ejs.co/#docs) in this
file. That is, you can insert JavaScript snippets directly into the file,
like so:

```
... you should get this response: <%- JSON.stringify({operationStatus: 'success'}) %>.
```

Ange will compile the line from above into this:


```
... you should get this response: {"operationStatus":"success"}.
```

Files with `.ange` in their names are recognised automatically. You can still compile files without `.ange` by targeting
them directly: `ange my-file.txt my-output.txt`. You can use `require(...)`, `__dirname` and `__filename` inside your
templates.

As you can see below, EJS supports different types of tags/template strings. Make sure to check out the Examples section
below and [EJS docs](http://ejs.co/#docs) to see what else is posisble.

```
<%- 'This string will be printed out unescaped: &<>' %>
<%= 'This string will be escaped: &<>' %>
```

### Output path

There are several ways to specify the output path. By default, Ange will just remove the `.ange` part from the filename
and write the output into the resultant path. You can also add the following line to the top of your file to specify
a custom output path:

```
<%# output: ./custom-output.txt -%>
```

Additionally, you can specify the output in the command line using `ange <input-path> <output-path>`, but this only
works when `<input-path>` is a single file (and not a directory).

### Note about `require(...)`

The `require()` method is passed to your templates as an EJS property. This lets you import different Node modules and
other JS files in your templates. To make relative paths work, Ange actually uses a wrapper that looks like this:

```javascript
const specialRequire = requirePath => {
    if (!requirePath.startsWith('.')) return require(requirePath);
    return require(path.resolve(templateDir, requirePath));
};
```

If you're getting some unexpected behaviour with `require(...)`, definition above should probably explain why. Make sure
to [create an issue](https://github.com/TimboKZ/Ange/issues) if you encounter a bug.

# Examples

Examples can be found in the `examples/` folder. You can run `ange -r` in that folder to rebuild all of the examples.

