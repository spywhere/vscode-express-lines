## Express-Lines
[![Version](http://vsmarketplacebadge.apphb.com/version/spywhere.guides.svg)](https://marketplace.visualstudio.com/items?itemName=spywhere.guides)
[![Installs](http://vsmarketplacebadge.apphb.com/installs/spywhere.guides.svg)](https://marketplace.visualstudio.com/items?itemName=spywhere.guides)

Perform code evaluation on selections

*Screenshot goes here*

### What is Express-Lines?
Express-Lines is a utility that will run expression (in various languages) from your selections and replace the output from the evaluated expression.

### What can be use with Express-Lines?
- Run a number sequence
- Text alignment
- Multi-line regular expression replacement
- and more... (examples below)

### How it works?
Simply install the extension, restart and you are good to go!

Select some selections,

- For default evaluation (in JavaScript), press `Ctrl+Alt+E` (Windows/Linux) or `Ctrl+Cmd+E` (macOS)
- For custom evaluation (using custom evaluator), press `Ctrl+Alt+C` (Windows/Linux) or `Ctrl+Cmd+C` (macOS)

then enter some expression or just press `Enter/Return`, your selections should be evaluated and replaced right away!

### Expression Syntax
An expression is simply a text that will pass to the `eval` function (in JavaScript) or as a one-liner code (for custom evaluator).
This expression system is really powerful as it can manipulate the text before passing on to the evaluator.

Each expression will be run for each selection and will be evaluated separately.

These are the macros that will provide the information about the selections and also for the manipulation...

- `\<`  
Returns a `<` character (aka. to escaped a `<` character)
- `<lineno>`  
Returns an active line number (a line that cursor is on)
- `<line>`  
Returns a whole text on an active line
- `<sel>` or `<selection>`  
Returns a selection text (can be multi-line)
- `<len:<sub-expression>>` or `<length:<sub-expression>>`  
Returns a length of a sub-expression output
- `<lower:<sub-expression>>`  
Returns a lower-cased output from a sub-expression
- `<upper:<sub-expression>>`  
Returns an upper-cased output from a sub-expression
- `<trim:<sub-expression>>`  
Returns a whitespace-trimmed output from a sub-expression
- `<trims:<sub-expression>>`  
Returns a joined, whitespace-trimmed output from each line of a sub-expression
- `<join:<value>:<sub-expression>>`  
Returns a joined output from each line of a sub-expression using `value` as a separator
- `<escaped:<sub-expression>>`  
Returns an escaped output from a sub-expression using `escapeCharacters` on the evaluator

#### Examples

Text:
```
    Alex is riding a bear to the village
while Bob is playing a kite. Meanwhile,
Carl is preparing food for them.
```

Selections:
- `Alex` on line 1
- `Bob` on line 2
- `Carl` on line 3

Expression: `<sel>`  
Output:
- `Alex` from 1st selection
- `Bob` from 2nd selection
- `Carl` from 3rd selection

Expression: `<line>`  
Output:
- `    Alex is riding a bear to the village` from 1st selection
- `while Bob is playing a kite. Meanwhile,` from 2nd selection
- `Carl is preparing food for them.` from 3rd selection

Expression: `<upper:<sel>>[<lineno>]`  
Output:
- `ALEX[1]` from 1st selection
- `BOB[2]` from 2nd selection
- `CARL[3]` from 3rd selection

Expression: `<escaped:"<len:<sel>>">`  
Output:
- `\"4\"` from 1st selection
- `\"3\"` from 2nd selection
- `\"4\"` from 3rd selection

Expression: `Line <lineno> contains <length:<trim:<line>>> characters`  
Output:
- `Line 1 contains 36 characters` from 1st selection
- `Line 2 contains 39 characters` from 2nd selection
- `Line 3 contains 32 characters` from 3rd selection

### Custom Evaluator

### Example Usages

#### Run a number sequence

#### Text alignment

#### Multi-line regular expression replacement

### FAQs

**Q:** License?  
**A:** MIT
