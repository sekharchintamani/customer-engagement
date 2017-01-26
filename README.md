# README #

# Newfi Customer Portal Redesign Prototype

While we're calling this a prototype, it has been developed as a
production-quality application, albeit a monolithic one, apart from Newfi's larger
backend applications. It has been extensively tested for functionality and
device support and can be used as-is, but since we may not be aware of particular
functional requirements, it should first be audited to ensure there are no missing
edge-cases.

## Dev Tools and Environment
This repo uses npm and grunt to manage a build process.

If setting up a new dev environment:

* clone the repo
* ensure npm is installed
* cd to the repository's path and execute:


```
#!bash

npm install
```


During development, to automatically recompile assets:


```
#!bash

grunt
```

To compile assets for production:


```
#!bash

grunt prod
```


This will do the following and place the results in the prod directory:

- minify the main css file
- copy icons css and images
- concatenated and uglified version of all javascript files (except jQuery) in a single file
- (in index.html)

  - replace individual script tags with a reference to the generated app.min.js
  - strip comments and whitespace


## Documentation

**The source files are all thoroughly documented. Review them for particulars. What follows is a high-level overview.**


### Project Structure

```

├── css                          Generated CSS and related assets. **Do not edit directly.**
├── index.html                   The prototype application
├── icons_source                 Source SVG images to be processed by grunt-icon task
├── js                           Files in this directory are specific to the project
|   ├── vendors                  Third-party libraries. **Do not edit directly.**
|   └── dev                      Files specific to this project, **for use in DEV only**
|       └── vendors              Third-party libraries. **Do not edit directly. For use in DEV only**
├── prod                         Generated production assets. **Do not edit directly.**
├── sass                         SCSS Source files
|   ├── customer-engagement.scss Primary scss file
|   ├── components               partials
|   ├── elements                 partials
|   ├── generic                  partials
|   ├── objects                  partials
|   ├── settings                 partials
|   ├── tools                    partials
|   ├── utliities                partials
├── .eslintrc                    javascript linting rules for this project
├── Gruntfile.js, package.json   Configuration files for the Grunt pipeline described above
```

### Style System
We've attempted to build a strong foundation for a modular style system
that can be extended to build a more maintainable and extensible codebase for Newfi's
whole backend as its UX and visual identity are refactored as part of the redesign
effort to come. At present, we've only built out the modules necessary for the customer
engagement portal redesign.

In particular, the html/sass modules used for form elements are derived from Salesforce's
open-source "Lightning" design system—that system has many more components that could be
used as further starting points for Newfi's system, and the larger system is built using
React, so if Newfi wants to modernize their application code, this will be a boon.

The css for this project uses BEM methodology [1], namespaces [2], and the Inuitcss
framework [3]. We made these choices to create a strong foundation for facilitating a
maintainable, larger and more complicated style system for Newfi's application(s)

 1. http://getbem.com/introduction/
 2. http://csswizardry.com/2015/03/more-transparent-ui-code-with-namespaces/
 3. https://github.com/inuitcss/inuitcss


### SVG Icons (with png fallbacks)

We are using Grunt-Icon to generate svg and fallback png css for icons.

To add new icons (or replace existing):

 1. Optimize source svg files and then add to the icons_source directory.
 2. Run the "grunt icons" task via shell to regenerate css and fallback png files.
 3. Add respective rules (for dimensions) to /sass/objects/\_objects.icon.scss


### Javascript

We've intentionally avoided using ECMA6 and any framework or strict methodology to
develop this prototype, since we don't know how  it will be integrated into Newfi's
larger codebase.

#### Dependencies

 - **jQuery** is used for its selector engine, minimal effects, ajax, deferred object system and a -  couple of its utility methods.
 - **jquery.validate** is used for form validation.
 - **lodash** (a customized build) is used for the following functions: forEach,isEqual,sum,values,has,round,sortBy
 - **accounting** is a library for formatting currency strings
 - **handlebars** for basic templating
 - **bootstrap.custom**  Using just the "collapse" and "transitions" scripts from Bootstrap, to match the behavior of the main site's mobile nav.
 - **rangeslider** Polyfill/extend functionality of html5 range inputs



### Who do I talk to? ###

* Original repo created by by Jade Orchard, Point of contact: David Twist, projects@jadeorchard.com