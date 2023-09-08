Meta-files proliferate in a JavaScript package (no matter what Node-based or submodule management approach you may be using). Every technology you add on top of vanilla includes at least one, if not more, manual configuration files at the top level of your project that are rarely (if ever) used at runtime. It's one of the crazier parts of the web development ecosystem.

For this reason, I will often consolidate structured inputs within custom `package.json` fields. These structures are then written out to the CI context when scripts are run, and the resulting files are added to our `.gitignore` to ensure there remains a single source of configuration specification at all times within the repository.

Let's look at some examples! Each one will include at least one custom `package.json` field, a script example, relevant `.gitignore` contents, and how this facilitates straightforward CI on both local development systems and remote runners.

## JSDoc

This is one of the more straightforward cases and maps directly to the JSDoc config specification documented here:

https://jsdoc.app/about-configuring-jsdoc.html

Here's the custom fields that I might put into a `package.json` file. Note we're also keeping a few placeholder fields empty (like name, summary, and copyright); we'll procedurally map those from the single-source-of-truth fields at script runtime.

```json
  ".jsdoc-conf": {
    "recurseDepth": 3,
    "source": {
      "includePattern": ".+\\.mjs$",
      "exclude": [
        "node_modules"
      ]
    },
    "tags": {
      "dictionaries": [
        "jsdoc"
      ]
    },
    "templates": {
      "systemName": "",
      "systemSummary": "",
      "monospaceLinks": true,
      "default": {
        "outputSourceFiles": false,
        "useLongnameInNav": true
      },
      "copyright": ""
    },
    "plugins": [
      "plugins/markdown"
    ]
  },
```

We can then add a "docs" script entry:

```json
  "scripts": {
    "docs": "node -e \"let pkg = require('./package.json'); pkg['.jsdoc-conf']['templates']['systemName'] = pkg['name']; pkg['.jsdoc-conf']['templates']['systemSummary'] = pkg['description']; pkg['.jsdoc-conf']['templates']['copyright'] = pkg['license']; console.log(JSON.stringify(pkg['.jsdoc-conf']))\" > .jsdoc-conf.json & jsdoc -R ./README.md -c ./.jsdoc-conf.json -t ./node_modules/foodoc/template ./index.mjs"
  }
```

This is a mess, but we only need to define it once. Let's break down what is going on:

1. First, a node command is used to load the declaration from `package.json` itself

1. We then map template parameters for system name; system summary; and copyright from the package name; description; and license fields, respectively

1. We can write out the object under the ".jsdoc-conf" property to a `.jsdoc-conf.json` file; this file is added to our `.gitignore` so we only have one authoritative specification of this configuration at any time tracked within the repository

1. Then we can run the `jsdoc` command, passing the temporary config as well as other parameters (like our README for splash page content, and the path to our template)

1. In this case we also point it directly at our index; this could be procedurally extracted from a "main" value but it won't change over the course of a single-file JavaScript module lifecycle

To run this script, we'll need to make sure dev dependencies includes "jsdoc" and (optionally) our template, "foodoc". We can then test from the command line:

```
> yarn add -D jsdoc foodoc
> yarn run docs
```

If successful we should see an `out/` folder generated, from which we can directly open our package documentation to browse & verify.

The CI job will simply yarn-install then yarn-run the "docs" script. We'll also want to make sure both the .jsdoc-conf.json file and "out/" folders are added to our `.gitignore` file. Finally, we can easily copy the contents of `out/` over to GitLab Pages hooks (if desired) for easy transcription to hosted/published HTML references.

![Screenshot of VS code viewing the temporary generated JSDoc configuration file](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4gai8kotq2xkkniankir.png)

## Jasmine

Jasmine configuration options are documented here:

https://jasmine.github.io/setup/nodejs.html

I actually write out two fields from package.json; one is the contents of the jasmine.json configuration file, and the other is actually a few boilerplate code of JavaScript for bootstrapping into the test cases within the index source code. You don't have to take an approach that follows this same technique, but just as I prefer to consolidate JSON into a single file, I much prefer to package test scripts into the module itself. Here's a basic example of the index source code that might use this approach.

![Screenshow of an embedded test case exported with module contents](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/rl15i2cjh8plhewu61vp.png)

To use this approach, we first add the boilerplate code to the `package.json` as ".jasmine-tests":

```json
  ".jasmine-tests": [
    "import { JUnitXmlReporter } from \"jasmine-reporters\";",
    "import index from \"./index.mjs\";",
    "const junitReporter = new JUnitXmlReporter({ \"consolidateAll\": true });",
    "jasmine.getEnv().addReporter(junitReporter);",
    "describe(\"thismodule\", () => {",
    " Object.keys(index.__tests__).forEach(k => {",
    "   it(k, index.__tests__[k]);",
    " });",
    "});"
  ],
```

While dense, there are several things going on within this boilerplate code:

1. We use a JUnit-style XML reporter to ensure test results will be machine-readable by subsequent analysis passes (including coverage and, in the case of GitLab, automatic CI reporting hooks)

1. The index source is then imported

1. A reporter is then instantiated

1. Jasmine is then used to fetch the environment and extend it with the reporter we have created

1. We then describe/define a top-level test closure that goes through each key-value pair in the "\_\_tests\_\_" export field; each test is then forwarded to the jasmine "it()" handler

The new "test" script entry we are adding will then look like this:

```json
  "scripts": {
    ...
    "test": "node -e \"console.log(JSON.stringify(require('./package.json')['.jasmine-conf']))\" > .jasmine-conf.json & node -e \"console.log(require('./package.json')['.jasmine-tests'].join('\\n'))\" > .jasmine-tests.mjs & jasmine --config=.jasmine-conf.json",
  }
```

Here's a breakdown of this script:

1. First, we write the jasmine configuration out to the `.jasmine-conf.json` file. Like other configurations, this has been added to our `.gitignore` file to ensure there remains a single source of truth tracked within the `package.json` file; we'll walk through those fields in a moment

1. We write out the tests boilerplate code from above to a `.jasmine-tests.mjs` file, where it will be available for execution within our runner environment

1. Lastly, jasmine itself is run, to which we pass the specific configuration file we have written out

Finally, let's look at the configuration we've included in the `package.json` property ".jasmine-conf":

```json
  ".jasmine-conf": {
    "spec_dir": ".",
    "spec_files": [
      ".jasmine-tests.mjs"
    ],
    "env": {
      "stopSpecOnExpectationFailure": false,
      "random": false
    }
  },
```

Our test specification in this case ("spec-files") is simply the bootstrapped code we have already written out; we run these tests from the current / top level folder so no other text content is required.

Once these three changes have been added, we can simply run the script from the command line, assuming we have also already installed the dev dependencies ("jasmine" and "jasmine-reporters").

```
> yarn add -D jasmine jasmine-reporters
> yarn run test
```

![Screenshot of VS code running tests via Jasmine while displaying the temporary generated jasmine configuration JSON](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/mwipmxxs8zcv5ah5haf2.png)

## C8

C8 configuration is primarily documented from the README via the project's GitHub page:

https://github.com/bcoe/c8#readme

Adding coverage is now relatively straightforward, largely because we can reuse the scripts defined above. Much like before, we now add a ".c8-conf" field to our package.json:

```json
  ".c8-conf": {
    "exclude-after-remap": true,
    "include": [
      "index.mjs"
    ],
    "exclude": [
      ".jasmine-tests.mjs"
    ],
    "reporter": [
      "cobertura",
      "text"
    ]
  },
```

Coverage is evaluated primarily against (in this case) a single top-level index source. We ignore the temporary tests boilerplate code written out in the previous stage, and ensure a machine-readable (cobertura in this case) output is generated. This greatly facilitates automatic consumption of coverage results by (for example) GitLab CI runners.

Here is the "coverage" script we add to our package.json:

```json
  "scripts": {
    ...
    "coverage": "node -e \"console.log(JSON.stringify(require('./package.json')['.c8-conf']))\" > .c8rc.json & c8 yarn run test"
  }
```

By now you can probably interpret what we're doing:

1. The contents of the ".c8-conf" property are written out to a file, which is again un-tracked courtesy of our `.gitignore` file

1. We then run c8 directly against the "test" script via yarn

This script can then be invoked from the command line or CI specification:

```
yarn add -D c8
yarn run coverage
```

![Screenshot of VS Code running coverage against the displayed c8 configuration JSON](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/oqrs7lkftoxf3mj1mndq.png)

## Conclusion

There are a lot of other easy ways to hook in CI jobs for modest JavaScript packages:

![Screenshot of 7 Easy GitLab CI Jobs for ES6-Compatible JavaScript](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/17sk55qv5395arvmbqo8.png)

But just focusing on these cases reduces the "meta-files" population from 9 to 5 by eliminating:

* JSDoc configuration JSON (while adding procedural hooks for package properties)

* Jasmine configuration JSON

* Jasmine top-level runner boilerplate code, or "spec"

* c8 configuration JSON for coverage evaluation

But it's a little convoluted when you look at the "scripts" definitions. Is this worth adding?

In my opinion, *yes*. "How can you get the most from the least?" is a good guiding principle, I think.

You see, it also makes me very nervous when we have multiple sources of truth for things like test configuration, package descriptions, etc. There is always a possibility that these truths will diverge, with obvious implications for authoritative values. We also incentivize CI rollout when we can streamline the template new JavaScript packages and developers need to leverage. And lastly, of course, for those of us with strong OCD tendencies, we can simply track fewer files for straightforward package contents (not to mention get a satisfactory `git clean -Xfd` when we want to remove them after verification).

And after all, doesn't this look better?

![From 9 meta-files to 5](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/79gwkqtbb1y4n5jg7hof.png)

To be fair, there's a lot more that you *could* include. Babel inputs, transpiling configuration, deployment or higher-level testing structures, and minification/obfuscation inputs are all great candidates. But these approaches won't vary too much from the examples we've seen here.

## References

This article is hosted on dev.to at:

https://dev.to/tythos/give-me-a-json-vasili-one-json-only-please-3kli

The source repository can be referenced on GitHub at:

https://github.com/Tythos/jscibox
