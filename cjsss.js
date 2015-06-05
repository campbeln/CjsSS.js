/*
CjsSS v0.9f (kk) http://opensourcetaekwondo.com/cjsss/
(c) 2014-2015 Nick Campbell cjsssdev@gmail.com
License: MIT
Add in a library such as Chroma (https://github.com/gka/chroma.js) to get color functionality present in LESS and Sass.
*/
(function (jQuery, _window, _document, fnOrchestration, fnEvalerFactory, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory) {
    //# CjsSS functionality
    var fnImplementation = function ($services) {
        'use strict';

        var _window = window,
            bExposed = false,
            reScript = /<script.*?>([\s\S]*?)<\/script>/gi,
            cjsss = "cjsss",
            $cjsss = {
                version: "v0.9f",
                options: {                                                  //# STRING (CSS Selector); See: http://lesscss.org/#client-side-usage , http://stackoverflow.com/questions/7731702/is-it-possible-to-inline-less-stylesheets
                    selector: "[" + cjsss + "],[data-" + cjsss + "],LINK[type='text/" + cjsss + "'],STYLE[type='text/" + cjsss + "']",
                    optionScope: "json",                                    //# STRING (enum: json, global, local, object, sandbox); 
                    scope: "isolated",                                      //# STRING (enum: global, local, object, sandbox); Javascript scope to evaluate code within.
                    expose: true,                                           //# BOOLEAN; Set window.cjsss?
                    async: true,                                            //# BOOLEAN; Process LINK tags asynchronously?
                    rescope: false,
                    d1: "[[", d2: "]]"                                      //# STRING; Delimiters denoting embedded Javascript variables (d1=start, d2=end).
                },
                data: {
                    cache: $services.cache,
                    inject: {},
                    services: {}
                },
                services: $services,

                //# We implement .process, .mixin and .inject with .apply below to ensure that these calls are always routed to the version under _window[cjsss].services (else a developer updating _window[cjsss].services.process would also have to update _window[cjsss].process)
                process: function () {
                    $services.js.process.apply(this, arguments);
                },
                mixin: function () {
                    $services.mixin.apply(this, arguments);
                },
                inject: function () {
                    $services.js.inject.apply(this, arguments);
                }
            },
            oDefaultOptions = $cjsss.options,                               //# Include these alias variables for improved code minimization
            oInjections = $cjsss.data.inject,
            oCache = $services.cache
        ;


        //# Escapes RegExp special characters for use in a RegExp expression as literals
        function escapeRegex(s) {
            return s.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
        } //# escapeRegex


        //# Compiles the options in effect for the passed sID (LINK and STYLE tags only) as well as establishing the oCache entry on the first request
        //#     TODO: Move under $services?
        function compileOptions($element, bIsLinkStyle, oData, sCSS) {
            var oReturnVal, fnOptionEvaler, a_sMatch,
                sID = $element.id
            ;

            //# Processes the set .scope, setting the .run, .evaler and .parent accordingly
            //#     NOTE: oReturnVal and sID are used from the outer scope
            //#     NOTE: This is only ever re-run for !bIsLinkStyle, so there is no need to worry about resetting .run as there are no .scripts
            function processScope() {
                //# Determine the first character of the .scope and process accordingly
                switch (oReturnVal.scope.substr(0, 1)) {
                    case "#": { //# String denoting a DOM ID
                        //# Run the .getParent logic then ensure the properties we import from our .parent are delete'd
                        oReturnVal = getParent(oReturnVal);
                        delete oCache[sID].run;
                        delete oCache[sID].evaler;
                        break;
                    }
                    case "l":   //# local
                    case "u": { //# useStrict
                        //# Ensure we don't have a .parent (else their .run and .evaler are imported) then set our own .run and .evaler
                        delete oCache[sID].parent;
                        oCache[sID].run = -1;
                        oCache[sID].evaler = $services.evalFactory[oReturnVal.scope]();
                        break;
                    }
                    default: {
                        //# Ensure we don't have a .parent (else their .run and .evaler are imported) then set our own .run and .evaler
                        delete oCache[sID].parent;
                        oCache[sID].run = 1;
                        oCache[sID].evaler = $services.evalFactory[oReturnVal.scope]();
                    }
                }
            } //# processScope


            //# Resolves the .parent of the passed $element
            //#     NOTE: oData and sID are used from the outer scope
            function getParent(oOptions) {
                var $parent,
                    sParentID = oOptions.scope.substring(1), //# Strip off the leading #
                    oParentCache = oCache[sParentID]
                ;

                //# If a oCache entry hasn't been setup for the sParentID yet
                if (!oParentCache) {
                    //# Collect the DOM reference to our $parent
                    $parent = _document.getElementById(sParentID);

                    //# If the sParentID exists in the DOM
                    if ($parent) {
                        //# If the $parent is a LINK tag and we have been told to do .async calls, .warn the user
                        if (oOptions.async && $element.tagName.toLowerCase() === "link") {
                            $services.warn("Orphaned element (asynchronously loaded LINK tags designated as parent scopes must be loaded prior to their children):", $element);
                        }
                            //# Else recurse to load the $parent now, resetting $parent to the .elements array returned by .process
                        else {
                            $parent = $services.js.process($parent, oData.oPro);
                            oParentCache = oCache[sParentID];
                        }
                    }
                        //# Else we were unable to find the .parent, so .warn
                    else {
                        $services.warn("Orphaned element (unable to locate parent ID '#" + sParentID + "'):", $element);
                    }
                }

                //# If we found a new .parent
                //#     NOTE: Unlike non-LINK/STYLE tags, the .parent is set at init only as the .scripts are reliant on each other (otherwise why would you share a .scope?)
                //#     NOTE: Any .warn's that occur while collecting our .parent are raised within .getParent
                if (oParentCache && oParentCache !== oCache[sID].parent) {
                    oCache[sID].parent = oParentCache;

                    //# If we recursed into .process, .concat the $parent element(s) into .r$e (a_$recursedElements)
                    if ($services.is.arr($parent)) {
                        oData.r$e = oData.r$e.concat($parent);
                    }

                    //# Now that we have our .parent set, update our oOptions with the new compiled options
                    oOptions = $services.js.getOptions(oData.oPro, oCache[sID]);
                }

                return oOptions;
            } //# getParent


            //# If the sID hasn't been oCache'd yet
            //#     NOTE: We setup the oCache here as if we did it at load, we would miss dynamically added DOM elements
            if (!oCache[sID]) {
                //a_sMatch = sCSS.match(/^\s*\/\*cjsss\(\{(.*)?\}\)\*\//i); //# Match the first non-whitespace characters on /*cjsss({ .*? })*/
                a_sMatch = sCSS.match(new RegExp("^\\s*\\/\\*" + cjsss + "\\(\\{(.*)?\\}\\)\\*\\/", "i")); //# Match the first non-whitespace characters on /*cjsss({ .*? })*/

                //# Setup the oCache entry for the sID
                oCache[sID] = {
                    //run: setBelow,
                    //evaler: setBelow,
                    //css: setBelow,
                    //cOptions: setBelow,
                    //aOptions: setBelow,
                    scripts: (bIsLinkStyle ? $services.getScripts(sCSS, $element) : null),
                    id: sID
                };

                //# If we have fnOptionEvaler options to evaluate
                if (oData.oA || a_sMatch) {
                    //# Setup the fnOptionEvaler based on the oData.oPre (PrelimOptions)
                    fnOptionEvaler = $services.evalFactory[oData.oPre.optionScope]();

                    //# If we have .aOptions
                    if (oData.oA) {
                        oCache[sID].aOptions = fnOptionEvaler(oData.oA);
                    }

                    //# If a .cOptions definition was found within the sCSS, e.g. /*cjsss({ "d1": "[[", "d2": "]]" })*/
                    if (bIsLinkStyle && a_sMatch && a_sMatch[1]) {
                        oCache[sID].cOptions = fnOptionEvaler('{' + a_sMatch[1] + '}');
                    }
                }

                //# Now that we have all of our options set, reset our oReturnVal
                oReturnVal = $services.js.getOptions(oData.oPro, oCache[sID]);

                //# Replace any commented delimiters with non-delimitered versions under .css
                oCache[sID].css = sCSS.replace(new RegExp("/\\*" + escapeRegex(oReturnVal.d1), "g"), oReturnVal.d1)
                    .replace(new RegExp(escapeRegex(oReturnVal.d2) + "\\*/", "g"), oReturnVal.d2)
                ;

                //# Process the .scope entry
                processScope();
            }
                //# Else the oCache entry has been setup, so simply collect our oReturnVal
            else {
                oReturnVal = $services.js.getOptions(oData.oPro, oCache[sID]);

                //# If we need to update the .parent, we need to reprocess the .scope entry
                if (!bIsLinkStyle && oReturnVal.rescope === true) {
                    processScope();
                }
            }

            return oReturnVal;
        } //# compileOptions


        //# Set our .version and .extend the passed $services with our own Vanilla Javascript (js) logic then .conf(igure) the $services
        //#      NOTE: Setting up $services like this allows for any internal logic to be overridden as well as allows for all versions of CjsSS to coexist under a single definition (though some .conf logic would need to be used)
        $services.version[cjsss] = $cjsss.version;
        $services.extend($services, {
            js: {
                //# Autorun functionality
                autorun: function () {
                    //# If we have a .selector then we need to .process them (using the default options of .process)
                    //#     NOTE: We pass in the .selector as the first argument of .process to allow the developer to set it to an array of DOM objects if they so choose
                    if (oDefaultOptions.selector) {
                        $services.js.process(oDefaultOptions.selector);
                    }
                        //# Else we'll need to .expose ourselves (otherwise the developer won't have access our functionality)
                    else {
                        //oDefaultOptions.expose = true;
                        $services.js.expose();
                    }
                }, //# autorun


                //# DOM querying functionality (defaulting to jQuery if it's present on-page)
                //#     NOTE: Include cjsss.polyfill.js or jQuery to support document.querySelectorAll on IE7 and below, see: http://quirksmode.org/dom/core/ , http://stackoverflow.com/questions/20362260/queryselectorall-polyfill-for-all-dom-nodes
                dom: jQuery || function (sSelector) {
                    //# Wrap the .querySelectorAll call in a try/catch to ensure older browsers don't throw errors on CSS3 selectors
                    //#     NOTE: We are not returning a NodeList on error, but a full Array (which could be confusing for .services developers if they are not careful).
                    try { return _document.querySelectorAll(sSelector); }
                    catch (e) { return []; }
                }, //# dom


                //# Exposes our functionality under the _window
                expose: function () {
                    //# If we've not yet been bExposed
                    if (!bExposed) {
                        bExposed = true;

                        //# .extend the current _window[cjsss] (if any) with the internal $cjsss, resetting both to the new .extend'ed object
                        //#     NOTE: oDefaultOptions and $services are .extended in the procedural code below, so there is no need to so it again here
                        $cjsss = _window[cjsss] = $services.extend(_window[cjsss], $cjsss);

                        //# Ensure that $cjsss is also .inject'd into any IFRAMEs
                        $services.js.inject(cjsss, $cjsss);
                    }
                }, //# expose


                //# Injects the passed variant (exposed as the passed sVarName) to all non-JSON eval'uated code
                inject: function (sVarName, variant) {
                    var bReturnVal = $services.is.str(sVarName);

                    //# If the passed sVarName .is.str(ing), set the passed variant into our oInjections
                    if (bReturnVal) {
                        oInjections[sVarName] = variant;
                    }
                    return bReturnVal;
                }, //# inject


                //# Compiles the options in the proper order of precedence
                getOptions: function (oProcessOptions, oCacheEntry) {
                    //# Ensure the passed $cacheEntry and oParentCacheEntry are objects
                    oCacheEntry = ($services.is.obj(oCacheEntry) ? oCacheEntry : {});
                    var oParentCacheEntry = oCacheEntry.parent || {};

                    //# Return the compiled options in the proper order of precedence (right most/last one wins)
                    return $services.extend({},
                        oDefaultOptions,
                        oParentCacheEntry.cOptions, oCacheEntry.cOptions,
                        oParentCacheEntry.aOptions, oCacheEntry.aOptions,
                        oProcessOptions
                    );
                }, //# getOptions


                //# Processes the CSS within the passed vElements using the provided oProcessOptions (overriding any previously set)
                process: function (vElements, oProcessOptions) {
                    var i, $current, sAttrName, sAOptions, sID, oData,
                        a_$elements = [],
                        a_$recursedElements = [],
                        oPrelimOptions = $services.js.getOptions(oProcessOptions /*, null*/),
                        fnHasAttribute = function (s) { return typeof this[s] !== 'undefined'; },
                        fnLinkTagCallback = function (bSuccess, sCSS, oData) {
                            //# If the call was a bSuccess, setup the new $style tag
                            if (bSuccess) {
                                var $style = _document.createElement('style');
                                $style.type = "text/css"; //# $style.setAttribute("type", "text/css");
                                $style.setAttribute(oData.attr, oData.$link.getAttribute(oData.attr) || "");

                                //# Replace the .$link with the new $style, then copy across the .id
                                oData.$link.parentNode.replaceChild($style, oData.$link);
                                $style.id = oData.id;

                                //# .processCSS, setting up our oCache entry as we go (via .compileOptions)
                                $services.js.processCSS(
                                    $style,
                                    compileOptions($style, true, {
                                        oA: oData.aOptions,
                                        oPre: oPrelimOptions,
                                        oPro: oProcessOptions,
                                        r$e: a_$recursedElements
                                    }, sCSS)
                                    //,false
                                );
                            }
                        }
                    ;

                    //# If a truthy vElements was passed
                    if (vElements) {
                        //# If the passed vElements is CSS Selector(-ish), select the a_$elements now
                        if ($services.is.str(vElements)) {
                            a_$elements = $services.js.dom(vElements);
                        }
                            //# Else ensure a_$elements is an array-like object
                            //#     NOTE: Since a NodeList is not a native Javascript object, .hasOwnProperty doesn't work
                        else {
                            a_$elements = (vElements[0] && vElements.length ? vElements : [vElements]);
                        }
                    }
                        //# Else if we have a .selector, reset the a_$elements accordingly
                    else if ($services.is.str(oPrelimOptions.selector)) {
                        a_$elements = $services.js.dom(oPrelimOptions.selector);
                    }

                    //# If we have been told to .expose ourselves, so do now (before we run any code below)
                    if (oPrelimOptions.expose) {
                        $services.js.expose();
                    }

                    //# Traverse the a_$elements (if any)
                    for (i = 0; i < a_$elements.length; i++) {
                        //# Reset the values for this loop
                        $current = a_$elements[i];
                        $current.hasAttribute = $current.hasAttribute || fnHasAttribute; //# .hasAttribute is IE8+ only, hence the polyfill
                        sAttrName = ($current.hasAttribute("data-" + cjsss) ? "data-" : "") + cjsss;
                        sAOptions = $current.getAttribute(sAttrName);

                        //# Ensure the $current a_$elements has an .id
                        sID = $current.id = $current.id || $services.newId();

                        //# Determine the .tagName and process accordingly
                        //#     NOTE: We utilize the oCache below so that we can re-process the CSS if requested, else we loose the original value when we reset innerHTML
                        switch ($current.tagName.toLowerCase()) {
                            case "style": {
                                //# If we already have a oCache entry
                                if (oCache[sID]) {
                                    //# Collect the compiled options into oData
                                    //#     NOTE: As the oCache entry already exists, there is no need to pass in the other arguments
                                    oData = compileOptions($current, true, { oPro: oProcessOptions } /*, $current.innerHTML*/);
                                }
                                    //# Else this is our first call
                                    //#     NOTE: We setup the oCache here because if we did it at page load, we would miss dynamically added DOM elements
                                else {
                                    oData = compileOptions($current, true, {
                                        oA: sAOptions,
                                        oPre: oPrelimOptions,
                                        oPro: oProcessOptions,
                                        r$e: a_$recursedElements
                                    }, $current.innerHTML);
                                }

                                //# .processCSS with the above compiled options (in oData) then ensure the .type of the STYLE tag is set for css
                                $services.js.processCSS($current, oData /*, false*/);
                                $current.type = "text/css";

                                //#     NOTE: If there are any issues in browsers that don't support the .type change above, we can use the code below instead
                                //#     NOTE: Per LESS.js's .loadStyles, they simply reset .type = 'text/css', so the code below SHOULD be unnecessary
                                //fnLinkTagCallback(
                                //    true,
                                //    $current.innerHTML,
                                //    {
                                //        $link: $current,
                                //        attr: sAttrName,
                                //        aOptions: sAOptions,
                                //        id: sID
                                //    }
                                //);
                                break;
                            }
                            case "link": {
                                //# Collect the css from the LINK's href'erenced file then fnLinkTagCallback to finish up
                                //#     NOTE: We use .href rather than .getAttribute("href") because .href is a fully qualified URI while .getAttribute returns the set string
                                $services.get($current.href, oPrelimOptions.async, {
                                    fn: fnLinkTagCallback,
                                    arg: {
                                        $link: $current,
                                        attr: sAttrName,
                                        aOptions: sAOptions,
                                        id: sID
                                    }
                                });
                                break;
                            }
                            default:
                                {
                                    //# If we already have a oCache entry
                                    if (oCache[sID]) {
                                        //# Setup the oCache entry while re-collecting our compiled options (including a new parent if we are to .rescope), then .processCSS
                                        $services.js.processCSS(
                                            $current,
                                            compileOptions($current, false, {
                                                oPro: oProcessOptions,
                                                r$e: a_$recursedElements
                                            } /*, attr.style*/),
                                            true
                                        );
                                    }
                                        //# Else this is our first call
                                        //#     NOTE: We setup the oCache here because if we did it at page load, we would miss dynamically added DOM elements
                                        //#     NOTE: In this instance, .compileOptions collects the .parent for this call so there is no need to do it manually
                                    else {
                                        //# Setup the oCache entry while collecting our compiled options, then .processCSS
                                        $services.js.processCSS(
                                            $current,
                                            compileOptions($current, false, {
                                                oA: (!sAOptions || sAOptions.indexOf("{") === 0 ? sAOptions : '{ "scope": "' + sAOptions + '" }'),
                                                oPre: oPrelimOptions,
                                                oPro: oProcessOptions,
                                                r$e: a_$recursedElements
                                            }, $current.getAttribute("style")),
                                            true
                                        );
                                    }
                                }
                        } //# switch()
                    } //# for()


                    //# Return the a_$elements to the caller, including the a_$recursedElements
                    return [].concat(a_$elements, a_$recursedElements);
                }, //# process()


                //# Processes the CSS associated with the passed $element
                //#     TODO: Split out .processCSS logic from .processElement to allow for Node.js calls against a passed CSS string
                processCSS: function ($element, oOptions, bSetAttribute) {
                    var i, a_sToken, sProcessedCSS, vResults,
                        a_sJS = [],
                        sID = $element.id,
                        oElementCache = oCache[sID].parent || oCache[sID],                  //# Default to the .parent (if any) as we primarily use its data below
                        a_sTokenized = oCache[sID].css                                      //# Source .css from the passed $element, not from its .parent
                            .replace(reScript, "")                                          //# Remove the SCRIPTs (so we don't have extra delimiters that get wrongly a_sTokenized)
                            .split(oOptions.d1)                                             //# Now .split the processed .css into a a_sTokenized array
                    ;

                    //# Callback function containing post-.evaler logic
                    //#     NOTE: We need this logic in a callback to support promises returned from .evaler
                    function callback(oResults) {
                        //# Set the first index of a_sTokenized into sProcessedCSS then traverse the rest of the a_sTokenized .css, rebuilding it as we go
                        //#     NOTE: Since we are splitting on .d(elimiter)1, the first index of a_sTokenized represents the STYLE before the first /*{{var}}*/ so we don't process it and simply set it as the start of our sProcessedCSS
                        sProcessedCSS = a_sTokenized[0];
                        for (i = 1; i < a_sTokenized.length; i++) {
                            //# Pull the result of the eval from the .results at the recorded .i(ndex) and append the trailing .css .s(tring)
                            sProcessedCSS += oResults.results[a_sTokenized[i].i] + a_sTokenized[i].s;
                        }

                        //# If we are supposed to bSetAttribute, then set the sProcessedCSS into it
                        if (bSetAttribute) {
                            $element.setAttribute("style", sProcessedCSS);
                        }
                            //# Else we are updating a STYLE tag
                        else {
                            //# If this is IE8 or below we'll have a .styleSheet (and .styleSheet.cssText) to set .css into, else we can use .innerHTML, see: http://stackoverflow.com/questions/9250386/trying-to-add-style-tag-using-javascript-innerhtml-in-ie8 , http://www.quirksmode.org/dom/html/#t00 , http://stackoverflow.com/questions/5618742/ie-8-and-7-bug-when-dynamically-adding-a-stylesheet , http://jonathonhill.net/2011-10-12/ie-innerhtml-style-bug/
                            //#     TODO: Test in IE8-
                            if ($element.styleSheet) {
                                $element.styleSheet.cssText = sProcessedCSS;
                            } else {
                                $element.innerHTML = sProcessedCSS;
                            }
                        }

                        //# If we had .errors .evaler'ing the a_sJS, .warn the caller
                        if (oResults.errors.length > 0) {
                            $services.warn("Errors occurred processing the Javascript for: ", $element, oResults.errors);
                        }
                    } //# callback


                    //# If we haven't .run the .scripts yet (or we are to always .run because they fall out of scope)
                    //#     NOTE: If we need to .run once, .run is set to 1 then decremented to 0 after the first .run. If we are supposed to .run every time it is set to -1 and decremented every time below 0
                    if (oElementCache.scripts && oElementCache.run !== 0) {
                        //# Decrement .run and reset a_sJS to the .scripts
                        //#     TODO: Need to get .scripts from oCache[sID] if it exists
                        oElementCache.run--;
                        a_sJS = oElementCache.scripts;
                    }

                    //# If we have a .parent and we need to run our .scripts
                    //#     NOTE: If we need to .run once, .run is set to 1 then decremented to 0 after the first .run. If we are supposed to .run every time it is set to -1 and decremented every time below 0
                    if (oCache[sID].parent && oCache[sID].scripts && oCache[sID].run !== 0) {
                        //# Decrement .run and reset a_sJS to the .scripts
                        //#     TODO: Need to get .scripts from oCache[sID] if it exists
                        oCache[sID].run--;
                        a_sJS = a_sJS.concat(oCache[sID].scripts);
                    }

                    //# Traverse the a_sTokenized .css
                    //#     NOTE: Since we are splitting on .d(elimiter)1, the first index of a_sTokenized represents the STYLE before the first /*{{var}}*/ so we don't process it and simply set it as the start of our sProcessedCSS
                    for (i = 1; i < a_sTokenized.length; i++) {
                        //# .split the a_sToken off the front of this entry
                        //#     NOTE: Since `.split(delimiter, limit)` truncates to `limit` rather than stopping, we need to .shift and .join below
                        a_sToken = a_sTokenized[i].split(oOptions.d2);

                        //# .shift and .push the first index into our a_sJS eval stack and re-.join the reminder
                        //#     NOTE: i: related index within a_sJS (as .push returns the new .length); s: trailing .css string
                        a_sTokenized[i] = {
                            i: a_sJS.push(a_sToken.shift()) - 1,
                            s: a_sToken.join(oOptions.d2)
                        };
                    }

                    //# Now that we have a fully populated our a_sJS eval stack, process it while passing in the (globally defined) oInjections
                    vResults = oElementCache.evaler(a_sJS, oInjections, true);

                    //# If the returned vResults is a promise then pass it our callback, else pass the vResults to our callback ourselves
                    if ($services.is.fn(vResults.then)) {
                        vResults.then(callback);
                    } else {
                        callback(vResults);
                    }
                }, //# processCSS


                //# Configures the base $services object to work with the current implementation
                conf: function () {
                    //# Set our .attr and .scopeAlias into the $services.config (so it can do error reporting and attribute processing correctly)
                    $services.config.attr = cjsss;
                    //$services.config.scopeAlias = "scope";
                    //$services.config.expandAttr = "{ $scopeAlias: '$attr' }";

                    //# Rewire the $services.scope.hook functionality
                    //$services.scope.hook = function (oData) { return oData; }

                    //# Before importing any external functionality, copy the original $service function references into .data.services
                    $cjsss.data.services = $services.extend({}, $services);

                    //# If the developer has already setup a _window[cjsss] object
                    //#     NOTE: These first calls to .is.obj, .is.fn and .extend are the only non-overridable pieces of code in CjsSS!
                    if ($services.is.obj(_window[cjsss])) {
                        //# If the developer has provided a servicesFactory, .extend it's results over our own $services
                        if ($services.is.fn(_window[cjsss].servicesFactory)) {
                            $services.extend($services, _window[cjsss].servicesFactory($cjsss));
                        }

                        //# .extend any developer .options over our oDefaultOptions
                        $services.extend(oDefaultOptions, _window[cjsss].options);
                    }

                    //# .inject our .mixin
                    $services.js.inject("mixin", $services.mixin);
                } //# conf

            }//# js
        }); //# extend($services...
        $services.js.conf();


        //####################
        //# Run-once code
        //####################

        //# Now .autorun
        $services.js.autorun();
    }; //# fnImplementation


    //####################################################################################################
    //# Call fnOrchestration
    //#     NOTE: We double handle fnEvalerFactory, fnLocalEvaler, fnUseStrictEvaler and fnSandboxEvalerFactory to allow them to have limited scopes
    //####################################################################################################
    fnOrchestration(_window, _document, fnImplementation, fnEvalerFactory, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory);
})(
    //# Include any external libraries, passing in as window.jQuery to allow it to be optional
    window.jQuery,

    //# Pass in the standard objects (code-golf)
    window,
    document,

    //# fnOrchestration function used to DI/ease maintenance across ngCss, CjsSS.js, $.CjsSS and EvalerJS
    function (_window, _document, fnImplementation, fnEvalerFactory, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory) {
        'use strict';

        //# Setup the required $baseServices
        var oCache = {},
            oCallOnComplete = {},
            _Object_prototype_toString = Object.prototype.toString, //# code-golf
            //reScriptTag = /<[\/]?script.*?>/gi,
            reScript = /<script.*?>([\s\S]*?)<\/script>/gi,
            $baseServices = {
                version: {
                    //evaler: '',
                    baseServices: 'v0.9f'
                },
                cache: oCache,
                coc: oCallOnComplete,

                config: {
                    attr: '',
                    scopeAlias: 'scope',
                    expandAttr: "{ $scopeAlias: '$attr' }"
                },


                //# Calls option functions with the standard arguments
                callOptionFn: function (fn, oCacheEntry) {
                    return ($baseServices.is.fn(fn) ? fn(oCacheEntry.dom, oCacheEntry) : undefined);
                },


                //# Sets up the oCache entry for the passed _element
                compile: function (_element, oPrelimOptions, fnOptionEvaler, fnCallback) {
                    var sID,
                        bIsLink = false,
                        a__Elements = [_element],
                        reD1 = new RegExp("/\\*" + oPrelimOptions.d1, "g"),
                        reD2 = new RegExp(oPrelimOptions.d2 + "\\*/", "g"),
                        reCSSOptions = new RegExp("^\\s*\\/\\*" + $baseServices.config.attr + "\\((\\{.*?\\})\\)\\*\\/", "i") //# Match the first non-whitespace characters on /*cjsss({ .*? })*/
                    ;


                    //# Wrapper for the passed fnOptionEvaler to catch and .warn on any e(rrors)
                    //#     NOTE: We do this to limit the requirements on the passed fnOptionEvaler as well as to standardize the error messages (as well as to clearly define the required interface of fnOptionEvaler)
                    //#     TODO: Not certian this is catching the errors as intended
                    function optionEvaler(sCode) {
                        try {
                            return fnOptionEvaler(sCode);
                        } catch (e) {
                            $baseServices.warn("Error evaluating `" + sCode + "` for", _element, e);
                            return {};
                        }
                    } //# optionEvaler


                    //# Evaluates the options within the passed sCSS as well as the _element's .attr
                    //#     TODO: Move to under $baseServices?
                    function getOptions(_element, sCSS) {
                        //# Ensure that .hasAttribute exists (IE8+ only, hence the polyfill)
                        _element.hasAttribute = _element.hasAttribute || $baseServices.hasAttribute;

                        var a_sMatch,
                            sBaseAttrName = $baseServices.config.attr, //# code-golf
                            sAttrName = (_element.hasAttribute(sBaseAttrName) ? sBaseAttrName : "data-" + sBaseAttrName), //# Determine the sAttrName in use (with or without the leading data-)
                            sAttrOptions = _element.getAttribute(sAttrName) || "",
                            oReturnVal = {
                                attr: sAttrName,
                                a: (sAttrOptions ? //# Preprocess the attribute options to guarentee an object
                                    //(sAttrOptions.indexOf("{") === 0 ? sAttrOptions : "{" + $baseServices.config.scopeAlias + ":'" + sAttrOptions + "'}") :
                                    (sAttrOptions.indexOf("{") === 0 ? sAttrOptions : $baseServices.config.expandAttr.replace(/\$scopeAlias/g, $baseServices.config.scopeAlias).replace(/\$attr/g, sAttrOptions.replace(/'/g, "\\'"))) :
                                    "{}"
                                )
                            }
                        ;

                        //# If this is a LINK or STYLE tag with sCSS to process
                        //#      NOTE: Non-LINK/STYLE tags do not pass in sCSS, so it'll resolve to falsey and will therefore not fall into this block
                        if (sCSS) {
                            //# Run the .match to locate any in-line reCSSOptions, setting .options.c(ss) if any are found
                            //#     NOTE: Due to how reCSSOptions is defined (requiring leading/trailing {}'s), we will always have an object definition in .c
                            a_sMatch = sCSS.match(reCSSOptions);
                            if (a_sMatch && a_sMatch[1]) {
                                oReturnVal.c = a_sMatch[1];
                            }
                        }

                        return oReturnVal;
                    } //# getOptions


                    //# Sets the oCache entry for the passed _element
                    //#     TODO: Move to under $baseServices?
                    function setCache(_element, sCSS, sTag, _link) {
                        var bIsStyleAttribute = (sTag === "*"),
                            _originalElement = _link || _element
                        ;

                        //# Setup the oCache entry for this _element
                        //#     NOTE: .scripts are not allowed in style attributes, nor are inline-defined options hence the bIsStyleAttribute ternary logic
                        oCache[_originalElement.id] = {
                            link: _link || null,
                            dom: _element,
                            tag: sTag,
                            options: getOptions(_originalElement, bIsStyleAttribute ? "" : sCSS),
                            scripts: (bIsStyleAttribute ? null : $baseServices.getScripts(sCSS, _originalElement)),
                            //data: optionallySetBelow,
                            //evaler: setBelow,

                            //# Implicitly removes and leading/training CSS comments from the .d(elimiter)1/.d(elimiter)2
                            //#     NOTE: In Angular, the .d(elimiter)1/.d(elimiter)2 are hard-set from $interpolate.startSymbol/.endSymbol
                            css: (sCSS || "").replace(reScript, "").replace(reD1, oPrelimOptions.d1).replace(reD2, oPrelimOptions.d2)
                        };
                    } //# setCache


                    //# Processes the .scope to (re)set the .evaler
                    function getEvaler(oCacheEntry, bSubsequentCall) {
                        var vParent,
                            oScope = $baseServices.scope.resolve(oCacheEntry, oPrelimOptions, optionEvaler),
                            sScope = oScope.s,
                            bSetEvaler = false,
                            bRecursed = false
                        ;

                        //# Sets the .evaler entry into the oCacheEntry
                        //#     NOTE: oCacheEntry, oScope.c(context) and bSetEvaler are used from the outer scope
                        function setCacheEvaler(oParentCacheEntry, sScope, sRunScope, fnEval) {
                            var a_sScripts = oCacheEntry.scripts || [],
                                iRun = 0 //# Default iRun to 0 so nothing is fnEval'ed by default
                            ;

                            //# Flip bSetEvaler
                            bSetEvaler = true;

                            //# If the oCacheEntry has .scripts to .run
                            if (a_sScripts.length > 0) {
                                //# Safely collect the sRunScope's first character then reset iRun based on the sRunScope
                                //#     NOTE: A sRunScope of "local" or "useStrict" require the .scripts to be .run on every call, hence the use of -1 (as a decremented -1 will never equal 0) while any other sRunScope requires only a single .run, hence 1 (which once decremented is equal to 0 and therefore not .run again)
                                //#     NOTE: Set use sRunScope.length rather than 1 below to catch any instances where sRunScope is passed as undefined (and therefore or'ed into "")
                                sRunScope = (sRunScope || "").substr(0, 1);
                                iRun = (sRunScope === "l" || sRunScope === "u" ? -1 : sRunScope.length);
                            }

                            //# Set the .evaler entry in the oCacheEntry
                            oCacheEntry.evaler = {
                                parent: oParentCacheEntry,
                                scope: sScope,
                                context: oScope.c,
                                $eval: fnEval,
                                run: iRun
                            };
                        } //# setCacheEvaler

                        //# If we are .go to .getEvaler
                        if (oScope.go) {
                            //# If we haven't ended up with a valid sScope after .scope.resolve's processing
                            if (!$baseServices.is.str(sScope)) {
                                //# If this is a bSubsequentCall, .warn the user
                                //#      NOTE: We filter based on initial/bSubsequentCall because on the initial call we can be running before the sScope has been setup, so we allow it to pass
                                if (bSubsequentCall) {
                                    $baseServices.warn("Invalid scope `" + sScope + "` for", _element, sScope);
                                }
                            }
                                //# Else if the .evaler hasn't been set yet, if the sScope has changed or if the .c(ontext) has changed
                            else if (!oCacheEntry.evaler || oCacheEntry.evaler.scope !== sScope || oCacheEntry.evaler.context !== oScope.c) {
                                //# If this is an non-related sScope
                                if (sScope.substr(0, 1) !== "#") {
                                    //# If the sScope defines a valid interface under the .evalFactory, .setCacheEvaler
                                    if ($baseServices.is.fn($baseServices.evalFactory[sScope])) {
                                        //# If this is a .sandbox request, create a new $iframe
                                        if (sScope === "sandbox") {
                                            //oScope.c = $baseServices.evaler.iframeFactory("allow-scripts", "" /*, undefined*/);
                                            // neek
                                            setCacheEvaler(null, sScope, sScope, $baseServices.evalFactory[sScope]($baseServices.evaler.iframeFactory("allow-scripts", "" /*, undefined*/)).global());
                                        }
                                            //# neek
                                        else {
                                            setCacheEvaler(null, sScope, sScope, $baseServices.evalFactory[sScope](oScope.c));
                                        }
                                    }
                                        //# Else the sScope is not a valid interface, so if this is a bSubsequentCall .warn the user
                                        //#     NOTE: We filter based on initial/bSubsequentCall because on the initial call we can be running before the sScope has been setup, so we allow it to pass
                                    else if (bSubsequentCall) {
                                        $baseServices.warn("Invalid evaler `" + sScope + "` for", oCacheEntry.dom);
                                    }
                                }
                                    //# Else the sScope is denoting a DOM ID
                                else {
                                    //# Try to pull our vParent from the oCache
                                    vParent = oCache[sScope.substr(1)];

                                    //# If we found our vParent, .setCacheEvaler
                                    if (vParent) {
                                        setCacheEvaler(vParent, sScope, vParent.evaler.scope, vParent.evaler.$eval); //# TODO: .evaler is null/blank
                                    }
                                        //# Else we need to bRecursed to .compile our vParent
                                    else {
                                        //# If we can find our vParent in the _document, flip bRecursed then, you know... recurse
                                        vParent = _document.getElementById(sScope.substr(1));
                                        if (vParent) {
                                            bRecursed = true;

                                            //# Recurse to .compile our vParent, passing in our own fnCallback
                                            $baseServices.compile(vParent, oPrelimOptions, fnOptionEvaler,
                                                function (oParentCacheEntry, a__AddedElements) {
                                                    //# If our oParentCacheEntry .is.obj, .setCacheEvaler
                                                    //#     NOTE: Any errors with .compile'ing our vParent are .warn'd by .compile so no need for another .warn here
                                                    if ($baseServices.is.obj(oParentCacheEntry)) {
                                                        setCacheEvaler(oParentCacheEntry, sScope, oParentCacheEntry.evaler.scope, oParentCacheEntry.evaler.$eval);
                                                    }

                                                    //# Now that our oCacheEntry is fully configured (+/-oParentCacheEntry), we can fnCallback (.concat'ing the a__AddedElements into our own a__Elements as we go)
                                                    fnCallback(oCacheEntry, a__Elements.concat(a__AddedElements));

                                                    //# If we have an entry in oCallOnComplete, call it now
                                                    if ($baseServices.is.fn(oCallOnComplete[sID])) {
                                                        oCallOnComplete[sID]();
                                                    }
                                                }
                                            );
                                        }
                                            //# Else the DOM ID in the sScope isn't present in the _document, so .warn
                                        else {
                                            $baseServices.warn("Unknown parent `" + sScope + "` for", _element /*, undefined*/);
                                        }
                                    }
                                }
                            }
                                //# Else we have an up-to-date .evaler so flip bSetEvaler as there is no need to reset it below
                            else {
                                bSetEvaler = true;
                            }
                        }

                        //# If we didn't bSetEvaler above, do it now as a null-entry
                        if (!bSetEvaler) {
                            setCacheEvaler(/*undefined, "", "", undefined*/);
                        }

                        //# If we haven't bRecursed, we can fnCallback now that our oCacheEntry is fully configured
                        if (!bRecursed) {
                            fnCallback(oCacheEntry, a__Elements);

                            //# If we have an entry in oCallOnComplete, call it now
                            if ($baseServices.is.fn(oCallOnComplete[sID])) {
                                oCallOnComplete[sID]();
                            }
                        }
                    } //# getEvaler


                    //####################
                    //# "Procedural" code
                    //####################
                    //# Collect the sID (while ensuring the _element has an .id)
                    sID = _element.id = _element.id || $baseServices.newId();

                    //# If we already have a oCache entry, send it into getEvaler to optionally reset our .evaler
                    if (oCache[sID]) {
                        getEvaler(oCache[sID], true);
                    }
                        //# Else we need to build the oCache entry for this _element
                    else {
                        //# Determine the .tagName and process accordingly
                        switch (_element.tagName.toLowerCase()) {
                            case "style": {
                                //# .setCache for this STYLE tag then remove the CSS from the _element
                                //#     NOTE: We remove the CSS so we avoid issues with partial styles and (in Angular) double processing of {{vars}}
                                setCache(_element, _element.innerHTML, "s" /*, undefined*/);
                                _element.innerHTML = "";
                                break;
                            }
                            case "link": {
                                bIsLink = true;

                                //# .get the file contents from the CSS file
                                $baseServices.get(_element.href,
                                    //# .getOptions for our _element (collecting only the .a(ttribute)), .optionEvaler it then safely .resolve its .async setting (if any) or fallback to oPrelimOptions's .async
                                    $baseServices.resolve(optionEvaler(getOptions(_element /*, ""*/).a), "async") || oPrelimOptions.async,

                                    //# fnCallback
                                    function (bSuccess, sCSS /*, $xhr*/) {
                                        //# If the .get was a bSuccess
                                        if (bSuccess) {
                                            var _style = _document.createElement('style');
                                            _style.appendChild(_document.createTextNode('')); //# WebKit hack

                                            //# Setup the oCache entry for the new _style _element
                                            //#     NOTE: .setCache needs to be called prior to replacing the LINK _element with the new _style
                                            setCache(_style, sCSS, "l", _element);

                                            //# Setup the new _style
                                            //#     NOTE: .innerHTML is set by the external managers on update, so there is no need to set it below
                                            _style.type = "text/css"; //# _style.setAttribute("type", "text/css");
                                            _style.setAttribute(oCache[sID].options.attr, oCache[sID].options.a);
                                            //_style.innerHTML = sCSS;

                                            //# Replace the LINK _element with the new _style, then reset _element and copy across the .id
                                            _element.parentNode.replaceChild(_style, _element);
                                            _element = _style;
                                            _style.id = sID;

                                            //# Now send the oCache entry into .getEvaler
                                            //#     NOTE: This is called here as oPrelimOptions.async may have been true, so we always call it here to avoid any/all .async issues
                                            getEvaler(oCache[sID] /*, false*/);
                                        }
                                            //# Else the call failed, so .warn and call the fnCallback ourselves (sending in undefined/a__Elements)
                                            //#     NOTE: If !bSuccess, then sCSS holds the error info
                                            //#     NOTE: We do not call a oCallOnComplete entry below as the call failed
                                        else {
                                            $baseServices.warn("Error retrieving `" + _element.href + "` for", _element, sCSS);
                                            fnCallback(undefined, a__Elements);
                                        }
                                    }
                                );
                                break;
                            }
                            default: {
                                //# .setCache for this _element (collecting the .css from the STYLE tag) then remove the style attribute from our _element
                                //#     NOTE: We remove the CSS so we avoid issues with partial styles and (in Angular) double processing of {{vars}}
                                setCache(_element, _element.getAttribute("style"), "*" /*, undefined*/);
                                _element.removeAttribute("style");
                            }
                        } //# switch

                        //# So long as this is not a bIsLink (which calls .getEvaler above), send the oCache entry into .getEvaler
                        if (!bIsLink) {
                            getEvaler(oCache[sID] /*, false*/);
                        }
                    }
                }, //# $baseServices.compile


                //# Extends the passed oTarget with the additionally passed N objects
                //#     NOTE: Right-most object (last argument) wins
                //#     NOTE: We do not take jQuery's .extend because this implementation of .extend always does a deep copy
                extend: function (oTarget) {
                    var i, sKey;

                    //# Ensure the passed oTarget is an object
                    oTarget = ($baseServices.is.obj(oTarget) ? oTarget : {});

                    //# Traverse the N passed arguments, appending/replacing the values from each into the oTarget (recursing on .is.obj)
                    //#     NOTE: i = 1 as we are skipping the oTarget
                    for (i = 1; i < arguments.length; i++) {
                        if ($baseServices.is.obj(arguments[i])) {
                            for (sKey in arguments[i]) {
                                if (arguments[i].hasOwnProperty(sKey)) {
                                    oTarget[sKey] = ($baseServices.is.obj(arguments[i][sKey]) ?
                                        $baseServices.extend(oTarget[sKey], arguments[i][sKey]) :
                                        arguments[i][sKey]
                                    );
                                }
                            }
                        }
                    }

                    //# For convenience, return the oTarget to the caller (to allow for `objX = $service.js.extend({}, obj1, obj2)`-style calls)
                    return oTarget;
                }, //# extend


                //# Evaluate in scope
                //#     NOTE: Allows for Injection logic
                //$eval: function(sID, vJS) {
                //    var oCacheEntry = oCache[sID];
                //    
                //    //# 
                //    if (oCacheEntry) {
                //        // oInject = { $scope: $scope, scope: $scope }
                //        return oCacheEntry.evaler.$eval(vJS, oCacheEntry.inject, true);
                //    }
                //},


                //# Wrapper for a GET AJAX call
                get: function (sUrl, bAsync, vCallback) {
                    /* global ActiveXObject: false */ //# JSHint "ActiveXObject variable undefined" error supressor
                    var $xhr,
                        XHRConstructor = (XMLHttpRequest || ActiveXObject)
                    ;

                    //# IE5.5+ (ActiveXObject IE5.5-9), based on http://toddmotto.com/writing-a-standalone-ajax-xhr-javascript-micro-library/
                    try {
                        $xhr = new XHRConstructor('MSXML2.XMLHTTP.3.0');
                    } catch (e) { }

                    //# If a function was passed rather than an object, object-ize it (else we assume it's an object with at least a .fn)
                    if ($baseServices.is.fn(vCallback)) {
                        vCallback = { fn: vCallback, arg: null };
                    }

                    //# If we were able to collect an $xhr object
                    if ($xhr) {
                        //# Setup the $xhr callback
                        //$xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                        $xhr.onreadystatechange = function () {
                            //# If the request is finished and the .responseText is ready
                            if ($xhr.readyState === 4) {
                                vCallback.fn(
                                    ($xhr.status === 200 || ($xhr.status === 0 && sUrl.substr(0, 7) === "file://")),
                                    $xhr.responseText,
                                    vCallback.arg,
                                    $xhr
                                );
                            }
                        };

                        //# GET the sUrl
                        $xhr.open("GET", sUrl, bAsync);
                        $xhr.send();
                    }
                        //# Else we were unable to collect the $xhr, so signal a failure to the vCallback.fn
                    else {
                        vCallback.fn(false, null, vCallback.arg, $xhr);
                    }
                }, //# $baseServices.get


                //# Collects the SCRIPT blocks within the passed sCSS, returning the eval stack
                getScripts: function (sCSS, _element) {
                    var a_sSrc, i,
                        a_sReturnVal = (sCSS || "").match(reScript) || [],
                        reDeScript = /<[\/]?script.*?>/gi,
                        reScriptSrc = /<script.*?src=['"](.*?)['"].*?>/i,
                        fnCallback = function (bSuccess, sJS, oData) {
                            a_sReturnVal[oData.i] = (bSuccess ? sJS : "");

                            //# If we were not successful, .warn the user
                            //#      NOTE: If !bSuccess, then sJS holds the error info
                            if (!bSuccess) {
                                $baseServices.warn("Error retrieving `" + oData.src + "` for", _element, sJS);
                            }
                        }
                    ;

                    //# Traverse the extracted SCRIPT tags from the .css (if any)
                    for (i = 0; i < a_sReturnVal.length; i++) {
                        a_sSrc = reScriptSrc.exec(a_sReturnVal[i]);

                        //# If there is an a_sSrc in the SCRIPT tag, .get the resulting js synchronously (hence `false`, as order of SCRIPTs matter)
                        //#     TODO: Try to make this async-able, but would need to promise this interface to accomplish
                        if (a_sSrc && a_sSrc[1]) {
                            $baseServices.get(a_sSrc[1], false, {
                                fn: fnCallback,
                                arg: {
                                    i: i,
                                    src: a_sSrc[1]
                                }
                            });
                        }
                            //# Else this is an inline SCRIPT tag, so load the reDeScript'd code into the a_sReturnVal eval stack
                        else {
                            a_sReturnVal[i] = a_sReturnVal[i].replace(reDeScript, "");
                        }
                    }

                    //# Return our a_sReturnVal to the caller
                    return a_sReturnVal;
                }, //# $baseServices.getScripts


                //# .hasAttribute Polyfill for IE8-
                hasAttribute: function (s) {
                    return typeof this[s] !== 'undefined';
                }, //# $baseServices.hasAttribute


                //# Datatype checking functionality
                is: {
                    str: function (s) {
                        //# NOTE: This function also treats a 0-length string (null-string) as a non-string
                        return ((typeof s === 'string' || s instanceof String) && s !== ''); //# was: (typeof s === 'string' || s instanceof String);
                    },
                    fn: function (f) {
                        return (_Object_prototype_toString.call(f) === '[object Function]');
                    },
                    obj: function (o) {
                        return (o && o === Object(o) && !$baseServices.is.fn(o));
                    },
                    arr: function (a) {
                        return (_Object_prototype_toString.call(a) === '[object Array]');
                    },
                    dom: function (x) {
                        return (x && $baseServices.is.str(x.tagName) && $baseServices.is.fn(x.getAttribute));
                    },
                    jq: function (x) {
                        return (x && $baseServices.is.fn(x.replaceWith) && $baseServices.is.dom(x[0]));
                    }
                }, //# $baseServices.is


                //# Transforms the passed object into an inline CSS string when vSelector is falsey (e.g. `color: red;`) or into CSS entry when vSelector is truthy (e.g. `selector { color: red; }`), where object._selector or vSelector is used for the selector
                mixin: function (oObj, vSelector, bCrLf) {
                    var sReturnVal = "",
                        sCrLf = (bCrLf ? "\n" : "")
                    ;

                    //# Transforms the passed object into an inline CSS string (e.g. `color: red;\n`)
                    //#     NOTE: This function recurses if it finds an object
                    function toCss(oObj, sCrLf) {
                        var sKey, vEntry,
                            sReturnVal = ""
                        ;

                        //# Traverse the oObj
                        for (sKey in oObj) {
                            //# So long as this is a .hasOwnProperty and is not a ._selector
                            if (oObj.hasOwnProperty(sKey) && sKey !== "_selector") {
                                vEntry = oObj[sKey];

                                //# Transform the sKey from camelCase to dash-case (removing the erroneous leading dash if it's there)
                                sKey = sKey.replace(/([A-Z])/g, '-$1').toLowerCase();
                                sKey = (sKey.indexOf("-") === 0 ? sKey.substr(1) : sKey);

                                //# If this vEntry .is.obj(ect), recurse toCss() the sub-obj
                                if ($baseServices.is.obj(vEntry)) {
                                    sReturnVal += toCss(vEntry, sCrLf);
                                }
                                    //# Else we assume this is a string-able based vEntry
                                else {
                                    sReturnVal += sKey + ":" + vEntry + ";" + sCrLf;
                                }
                            }
                        }

                        return sReturnVal;
                    }


                    //# If the passed oObj .is.obj, we need to reset our sReturnVal
                    if ($baseServices.is.obj(oObj)) {
                        sReturnVal = (vSelector ? ($baseServices.is.str(vSelector) ? vSelector : oObj._selector) + " {" : "") + sCrLf +
                            toCss(oObj, sCrLf) + sCrLf +
                            (vSelector ? "}" : "")
                        ;
                    }
                        //# Else if the passed oObj .is.str, then we have a selector-style request
                    else if ($baseServices.is.str(oObj)) {

                    }

                    return sReturnVal;
                }, //# $baseServices.mixin


                //# Returns an unused HTML ID
                //#     NOTE: Use the following snipit to ensure a DOM _element has an .id while still collecting the sID: `sID = _element.id = _element.id || $baseServices.newId();`
                //#     NOTE: sPrefix must begin with /A-Za-z/ to be HTML4 compliant (see: http://stackoverflow.com/questions/70579/what-are-valid-values-for-the-id-attribute-in-html)
                newId: function (sPrefix) {
                    var sReturnVal;

                    //# Ensure a sPrefix was passed
                    sPrefix = sPrefix || $baseServices.config.attr + "_";

                    //# Do while our sReturnVal exists as a DOM ID in the _document, try to find a unique ID returning the first we find
                    //#     NOTE: sReturnVal is not re-declared on each loop as the var is hoisted
                    do {
                        sReturnVal = sPrefix + Math.random().toString(36).substr(2, 5);
                    } while (_document.getElementById(sReturnVal));

                    return sReturnVal;
                }, //# $baseServices.newId


                //# Safely resolves the passed sPath within the passed oObject, returning undefined if the sPath is not located
                //#     NOTE: To default a value, use the following snipit: `var v = $baseServices.resolve({}, 'some.path') || 'default value';`
                resolve: function (oObject, sPath) {
                    var a_sPath, i;

                    //# Since we reuse the passed oObject as our return value, reset it to undefined if it's not .is.obj
                    oObject = ($baseServices.is.obj(oObject) ? oObject : undefined);

                    //# If the passed oObject .is.obj and sPath .is.str, .split sPath into a_sPath
                    if (oObject && $baseServices.is.str(sPath)) {
                        a_sPath = sPath.split(".");

                        //# Traverse the a_sPath, resetting the oObject to the value present at the current a_sPath or undefined if it's not present (while falling from the loop)
                        for (i = 0; i < a_sPath.length; i++) {
                            if ($baseServices.is.obj(oObject) && a_sPath[i] in oObject) {
                                oObject = oObject[a_sPath[i]];
                            } else {
                                oObject = undefined;
                                break;
                            }
                        }
                    }

                    return oObject;
                }, //# $baseServices.resolve


                //# Javascript Scope and Context resolution service used within .compile
                scope: {
                    //# Recursively resolves the .s(cope) and .c(ontext) for the passed oCacheEntry
                    resolve: function (oCacheEntry, oPrelimOptions, fnOptionEvaler) {
                        var sScopeAlias = $baseServices.config.scopeAlias,  //# code-golf
                            oReturnVal = $baseServices.scope.$(             //# Build the object (collecting the .s(cope)) and pass it into the rescurive $ function
                                {
                                    //c: undefined,
                                    s: $baseServices.resolve(fnOptionEvaler(oCacheEntry.options.a), sScopeAlias) || oPrelimOptions[sScopeAlias],
                                    go: true
                                },
                                oCacheEntry
                            )
                        ;

                        //# If a .c(ontext) has been passed and we are not a local or usestrict .s(cope), .warn the user
                        if (oReturnVal.c) {
                            switch (oReturnVal.s.toLowerCase()) {
                                case "local":
                                case "usestrict": {
                                    break;
                                }
                                default: {
                                    $baseServices.warn("Context cannot be used with `" + oReturnVal.s + "`", oCacheEntry.dom);
                                    //break;
                                }
                            }
                        }

                        return oReturnVal;
                    },

                    //# Default implementation of the hook called during recursion
                    hook: function (oData) { return oData; },

                    //# Rescursive resolver
                    $: function (oData, oCacheEntry) {
                        //# If the .s(cope) .is.fn, call it with the oCacheEntry while resetting .s(cope) to its result
                        if ($baseServices.is.fn(oData.s)) {
                            oData.s = $baseServices.callOptionFn(oData.s, oCacheEntry);
                        }

                        //# If the .s(cope) .is.obj
                        if ($baseServices.is.obj(oData.s)) {
                            //# If .s(cope) .is.jq, extract the first DOM element (so it's caught below by .is.dom), else leave it as-is
                            oData.s = ($baseServices.is.jq(oData.s) ? oData.s[0] : oData.s);

                            //# If .s(cope) is a DOM element, collect its .id (while ensuring it has one) as a #selector
                            if ($baseServices.is.dom(oData.s)) {
                                oData.s.id = oData.s.id || $baseServices.newId();
                                oData.s = '#' + oData.s.id;
                            }
                                //# Else if .s(cope) is a .context definition, set .c(ontext) and reset .s(cope) accordingly
                                //#     NOTE: This can result in some funky behavior if the .scope defines an [object] or [function] that (eventually) returns an [object] as the last defined .context will win
                            else if ($baseServices.config.scopeAlias in oData.s && 'context' in oData.s) {
                                oData.c = oData.s.context;
                                oData.s = oData.s[$baseServices.config.scopeAlias];
                            }
                                //# Else .s(cope) is a plain old Javascript object, so set oContext and reset .s(cope) to 'local'
                            else {
                                oData.c = oData.s;
                                oData.s = 'local';
                            }
                        }

                        //# Before recursing or returning, call the .hook
                        //#     NOTE: This enables implementation-specific .s(cope) and .c(ontext) decoding (such as accessing the surrounding $scope in ngCss)
                        oData = $baseServices.scope.hook(oData);

                        //# If the .s(cope) is a recursive type, recurse now to recalculate the .s(cope)
                        if ($baseServices.is.obj(oData.s) || $baseServices.is.fn(oData.s)) {
                            oData = $baseServices.scope.$(oData, oCacheEntry);
                        }

                        return oData;
                    }
                }, //# scope


                //# Safely warns the user on the console
                warn: function (sMessage, _element, vError) {
                    var c = console || function () { }; //# code-golf
                    (c.warn || c.log || c)($baseServices.config.attr + ": " + sMessage, _element, vError);
                } //# $baseServices.warn
            } //# $baseServices
        ;


        //####################
        //# "Procedural" code
        //####################
        //# Build the passed fnEvalerFactory
        //#     NOTE: The fnLocalEvaler is specifically placed outside of the "use strict" block to allow for the local eval calls below to persist across eval'uations
        $baseServices.evalFactory = fnEvalerFactory(_window, _document, $baseServices, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory);

        //# Now that we have everything orchestrated, run the fnImplementation functionality
        fnImplementation($baseServices);
    },

    //# <EvalerJS>
    //# fnEvalerFactory function. Base factory for the evaler logic
    function (_window, _document, $services, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory) {
        "use strict";

        var fnJSONParse,
            sVersion = "v0.9f",
            fnGlobalEvaler = null
        ;

        //# Optionally returns a Javascript string or sets up the fnGlobalEvaler to access the global version of eval
        function getGlobalEvaler(bCode) {
            //# Build the Javascript code that safely collects the global version of eval
            //#     NOTE: A fallback function is recommended as in some edge cases this function can return `undefined`
            //#     NOTE: Based on http://perfectionkills.com/global-eval-what-are-the-options/#the_problem_with_geval_windowexecscript_eval
            var sGetGlobalEval =
                    "try{" +
                        "return(function(g,Object){" +
                            "return((1,eval)('Object')===g" +
                                "?function(){return(1,eval)(arguments[0]);}" +
                                    ":(window.execScript?function(){return window.execScript(arguments[0]);}:undefined)" +
                                ");" +
                            "})(Object,{});" +
                        "}catch(e){return undefined;}"
            ;

            //# If we are supposed to return the bCode, do so now
            if (bCode) {
                return sGetGlobalEval;
            }
                //# Else if we haven't setup the fnGlobalEvaler yet, do so now
                //#     NOTE: A function defined by a Function() constructor does not inherit any scope other than the global scope (which all functions inherit), even though we are not using this paticular feature (as getGlobalEvaler gets the global version of eval)
            else if (fnGlobalEvaler === null) {
                fnGlobalEvaler = new Function(sGetGlobalEval)();
            }
        } //# getGlobalEvaler


        //# Factory function that configures and returns a looper function for the passed fnEval and oContext
        function looperFactory(fnEval, $window, oContext, bInContext /*, $sandboxWin*/) {
            //# Return the configured .looper function to the caller
            return function (vJS, oInject, bReturnObject) {
                var i,
                    bAsArray = $services.is.arr(vJS),
                    bInjections = $services.is.obj(oInject),
                    oReturnVal = {
                        js: (bAsArray ? vJS : [vJS]),
                        results: [],
                        errors: []
                    }
                ;

                //# Determine the type of fnEval and process accordingly
                switch (fnEval) {
                    case fnLocalEvaler:
                    case fnUseStrictEvaler: {
                        //# Polyfill Object.keys for use by calls to fnLocalEvaler and fnUseStrictEvaler
                        //#     NOTE: From http://tokenposts.blogspot.com.au/2012/04/javascript-objectkeys-browser.html via https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
                        if (!Object.keys) Object.keys = function (o) {
                            if (o !== Object(o))
                                throw new TypeError('Object.keys called on a non-object');
                            var k = [], p;
                            for (p in o) if (Object.prototype.hasOwnProperty.call(o, p)) k.push(p);
                            return k;
                        };

                        //# As this is either a fnLocalEvaler or fnUseStrictEvaler, we need to let them traverse the .js and non-oContext oInject'ions, so call them accordingly
                        //#     NOTE: oReturnVal is updated byref, so there is no need to collect a return value
                        if (bInContext) {
                            fnEval.call(oContext, oReturnVal, 0, (bInjections ? { o: oInject, k: Object.keys(oInject), c: '' } : null));
                        } else {
                            fnEval(oReturnVal, 0, (bInjections ? { o: oInject, k: Object.keys(oInject), c: '' } : null));
                        }
                        break;
                    }
                    default: {
                        //# If we have a $window (as 'json' does not) and the passed oInject .is.obj
                        if ($window && bInjections) {
                            //# Traverse oInject, setting each .hasOwnProperty into the $window (leaving $window's current definition if there is one)
                            for (i in oInject) {
                                if ($window[i] === undefined && oInject.hasOwnProperty(i)) {
                                    $window[i] = oInject[i];
                                }
                            }
                        }

                        //# Traverse the .js, .pushing each fnEval .results into our oReturnVal (optionally .call'ing bInContext if necessary as we go)
                        for (i = 0; i < oReturnVal.js.length; i++) {
                            try {
                                //oReturnVal.results.push(bInContext ? fnEval.call(oContext, oReturnVal.js[i]) : fnEval(oReturnVal.js[i]));
                                oReturnVal.results.push(fnEval(oReturnVal.js[i]));
                            } catch (e) {
                                //# An error occured fnEval'ing the current i(ndex), so .push undefined into this i(ndex)'s entry in .results and log the .errors
                                oReturnVal.results.push(undefined);
                                oReturnVal.errors.push({ index: i, error: e, js: oReturnVal.js[i] });
                            }
                        }
                    }
                }

                //# If we are supposed to bReturnObject return our oReturnVal, else only return the .results (either bAsArray or just the first index)
                return (bReturnObject ? oReturnVal : (bAsArray ? oReturnVal.results : oReturnVal.results[0]));
            };
        } //# looperFactory


        //# Adds an IFRAME to the DOM based on the passed sSandboxAttr and sURL
        function iframeFactory(sSandboxAttr, sURL, $domTarget) {
            var sID = $services.newId("sandbox");

            //# As long as the caller didn't request an IFRAME without a sandbox attribute, reset sSandboxAttr to an attribute definition
            sSandboxAttr = (sSandboxAttr === null ?
                '' :
                ' sandbox="' + (sSandboxAttr ? sSandboxAttr : "allow-scripts") + '"'
                );

            //# .insertAdjacentHTML IFRAME at the beginning of the .body (or .head)
            //#     NOTE: In order to avoid polyfilling .outerHTML, we simply hard-code the IFRAME code below
            //#     TODO: Optionally calculate sURL based on the script path
            ($domTarget || _document.body || _document.head || _document.getElementsByTagName("head")[0])
                .insertAdjacentHTML('afterbegin', '<iframe src="' + sURL + '" id="' + sID + '" style="display:none;"' + sSandboxAttr + '></iframe>')
            ;

            //# Return the $iframe object to the caller
            return _document.getElementById(sID);
        } //# iframeFactory


        //# Factory function that returns a looper function for the requested evaluation eMode, oContext and oConfig
        function evalerFactory(eMode, oContext, oConfig) {
            var fnEvaler, fnReturnValue,
                sEval = "eval",
                bContextPassed = (oContext !== undefined && oContext !== null)
            ;

            //# Default the oContext to _window if it wasn't passed
            //#     TODO: Is this default value logic still required?
            oContext = (bContextPassed ? oContext : _window);

            //# Determine the eMode and process accordingly
            switch (eMode/*.substr(0, 1).toLowerCase()*/) {
                //# global (meaning oContext should be a window object)
                case "g": {
                    //# If this is a request for the current _window
                    if (oContext === _window) {
                        //# Ensure the fnGlobalEvaler has been setup, then safely set it (or optionally fnLocalEvaler if we are to .f(allback)) into fnEvaler
                        getGlobalEvaler();
                        fnEvaler = (!fnGlobalEvaler && oConfig.f ? fnLocalEvaler : fnGlobalEvaler);

                        //# If we were able to collect an fnEvaler above, return the configured looper
                        if (fnEvaler) {
                            fnReturnValue = looperFactory(fnEvaler, _window/*, undefined, false*/);
                        }
                    }
                        //# Else if the passed oContext has an .eval function (e.g. it's a window object)
                        //#     NOTE: We Do some back flips with sEval below because strict mode complains about using .eval as it's a pseudo-reserved word, see: https://mathiasbynens.be/notes/reserved-keywords
                    else if ($services.is.fn(oContext[sEval])) {
                        //# Attempt to collect the foreign fnGlobalEvaler, then safely set it (or optionally the foreign fnLocalEvaler if we are to .f(allback)) into fnEvaler
                        fnEvaler = oContext[sEval]("(function(){" + getGlobalEvaler(true) + "})()");
                        fnEvaler = (!fnEvaler && oConfig.f ? function (/* sJS */) { return oContext[sEval](arguments[0]); } : fnEvaler);

                        //# If we were able to collect an fnEvaler above, return the configured looper (or the fnEvaler if this is a .r(ecursiveCall))
                        if (fnEvaler) {
                            fnReturnValue = (oConfig.r ? fnEvaler : looperFactory(fnEvaler, oContext/*, undefined, false*/));
                        }
                    }
                    //# Else the passed oContext is not valid for a global request, so return undefined
                    //#     NOTE: The code below isn't actually necessary as this is the default behavior of a function with no defined return
                    //else {
                    //    return undefined;
                    //}
                    break;
                }
                    //# local
                case "l": {
                    fnReturnValue = looperFactory(fnLocalEvaler, _window, oContext, bContextPassed);
                    break;
                }
                    //# "use strict"
                case "u": {
                    fnReturnValue = looperFactory(fnUseStrictEvaler, _window, oContext, bContextPassed);
                    break;
                }
                    //# isolated
                case "i": {
                    //# Ensure the passed oConfig .is.obj, then build the IFRAME and collect its .contentWindow
                    //#     NOTE: We send null into .iframeFactory rather than "allow-scripts allow-same-origin" as browsers log a warning when this combo is set, and as this is simply an isolated (rather than a sandboxed) scope the code is trusted, but needs to have its own environment
                    oConfig = ($services.is.obj(oConfig) ? oConfig : {});
                    oConfig.iframe = iframeFactory(null, "" /*, undefined*/);
                    oConfig.window = oConfig.iframe.contentWindow;

                    //# Recurse to collect the isolated .window's fnEvaler (signaling to .f(allback) and that we are .r(ecursing))
                    fnEvaler = evalerFactory("g", oConfig.window, { f: 1, r: 1 });

                    //# Return the configured looper, defaulting oContext to the $sandboxWin if !bContextPassed
                    //#     NOTE: Since we default oContext to _window above, we need to look at bContextPassed to send the correct second argument
                    //#     NOTE: Due to the nature of eval'ing in the global namespace, we are not able to .call with a oContext
                    //fnReturnValue = looperFactory(fnEvaler, oConfig.window, (bContextPassed ? oContext : null), bContextPassed);
                    //fnReturnValue = looperFactory(fnEvaler, oConfig.window /*, oContext, bContextPassed*/);
                    var fnReturnValue2 = looperFactory(fnEvaler, oConfig.window /*, oContext, bContextPassed*/);

                    // neek
                    //console.log("iframe made", oConfig);
                    fnReturnValue = function (one, two, three) {
                        //console.log("evalin!");
                        return fnReturnValue2(one, two, three);
                    };
                    break;
                }
                    //# json
                case "j": {
                    //# JSON.parse never allows for oInject'ions nor a oContext, so never pass a oContext into the .looperFactory (which in turn locks out oInject'ions)
                    fnReturnValue = looperFactory(fnJSONParse/*, _window, undefined, undefined, false*/);
                    break;
                }
            }

            return fnReturnValue;
        } //# evalerFactory


        //# Set our .version and .extend the passed $services with our own EvalerJS (evaler) logic
        //#      NOTE: Setting up $services like this allows for any internal logic to be overridden as well as allows for all versions of CjsSS to coexist under a single definition (though some .conf logic would need to be used)
        $services.version.evaler = sVersion;
        $services.extend($services, {
            evaler: {
                iframeFactory: iframeFactory
            }
        });

        //# If the native JSON.parse is available, set fnJSONParse to it
        if (_window.JSON && _window.JSON.parse) {
            fnJSONParse = _window.JSON.parse;
        }
            //# Else if $jQuery's .parseJSON is available, set fnJSONParse to it
        else if (_window.jQuery && _window.jQuery.parseJSON) {
            fnJSONParse = _window.jQuery.parseJSON;
        }

        //# Configure and return our return value
        return {
            $version: sVersion,
            global: function (bFallback, $window) {
                return evalerFactory("g", $window || _window, { f: bFallback });
            },
            local: (!fnLocalEvaler ? undefined : function (oContext) {
                return evalerFactory("l", oContext /*, {}*/);
            }),
            useStrict: (!fnUseStrictEvaler ? undefined : function (oContext) {
                return evalerFactory("u", oContext /*, {}*/);
            }),
            isolated: function (oReturnedByRef) {
                return evalerFactory("i", null, oReturnedByRef);
            },
            json: (!fnJSONParse ? undefined : function () {
                return evalerFactory("j" /*, undefined, {}*/);
            }),
            sandbox: (!fnSandboxEvalerFactory ?
                undefined :
                fnSandboxEvalerFactory(_window, $services, { looper: looperFactory, iframe: iframeFactory })
            )
        };
    },
    //# fnLocalEvaler function. Placed here to limit its scope and local variables as narrowly as possible (hence the use of arguments[0])
    function (/* oData, i, oInjectData */) {
        //# If oInjectData was passed, traverse the injection .o(bject) .shift'ing off a .k(ey) at a time as we set each as a local var
        if (arguments[2]) {
            while (arguments[2].k.length > 0) {
                arguments[2].c = arguments[2].k.shift();
                eval("var " + arguments[2].c + "=arguments[2].o[arguments[2].c];");
            }
        }

        //# Ensure the passed i (aka arguments[1]) is 0
        //#     NOTE: i (aka arguments[1]) must be passed in as 0 ("bad assignment")
        //arguments[1] = 0;

        //# Traverse the .js, processing each entry as we go
        //#     NOTE: We use a getto-version of a for loop below to keep JSHint happy and to limit the exposed local variables to `arguments` only
        while (arguments[1] < arguments[0].js.length) {
            try {
                eval(arguments[0].js[arguments[1]]);
            } catch (e) {
                //# An error occured fnEval'ing the current index, so .push undefined into this index's entry in .results and log the .errors
                arguments[0].results.push(undefined);
                arguments[0].errors.push({ index: arguments[1], error: e, js: arguments[0].js[arguments[1]] });
            }
            arguments[1]++;
        }

        //# Return the modified arguments[0] to the caller
        //#     NOTE: As this is modified byref there is no need to actually return arguments[0]
        //return arguments[0];
    },
    //# fnUseStrictEvaler function. Placed here to limit its scope and local variables as narrowly as possible (hence the use of arguments[0])
    //#     NOTE: Since we cannot conditionally invoke strict mode (see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#Invoking_strict_mode) we need 2 implementations for fnLocalEvaler and fnUseStrictEvaler
    function (/* oData, i, oInjectData */) {
        //# If oInjectData was passed, traverse the injection .o(bject) .shift'ing off a .k(ey) at a time as we set each as a local var
        //#     NOTE: We do this outside of the "use strict" function below so we don't need to pollute the global context while still having persistent var's across eval'uations (which "use strict" doesn't allow)
        if (arguments[2]) {
            while (arguments[2].k.length > 0) {
                arguments[2].c = arguments[2].k.shift();
                eval("var " + arguments[2].c + "=arguments[2].o[arguments[2].c];");
            }
        }

        //# Ensure the passed i (aka arguments[1]) is 0
        //#     NOTE: i (aka arguments[1]) must be passed in as 0 ("bad assignment")
        //arguments[1] = 0;

        //# Setup the internal function with "use strict" in place
        (function () {
            "use strict";

            //# Traverse the .js, processing each entry as we go
            //#     NOTE: We use a getto-version of a for loop below to keep JSHint happy and to limit the exposed local variables to `arguments` only
            while (arguments[1] < arguments[0].js.length) {
                try {
                    eval(arguments[0].js[arguments[1]]);
                } catch (e) {
                    //# An error occured fnEval'ing the current index, so .push undefined into this index's entry in .results and log the .errors
                    arguments[0].results.push(undefined);
                    arguments[0].errors.push({ index: arguments[1], error: e, js: arguments[0].js[arguments[1]] });
                }
                arguments[1]++;
            }
        })(arguments[0], 0, arguments[2]);

        //# Return the modified arguments[0] to the caller
        //#     NOTE: As this is modified byref there is no need to actually return arguments[0]
        //return arguments[0];
    },
    //# fnSandboxEvalerFactory function.
    function (_window, $services, $factories) {
        "use strict";

        var a_fnPromises = [],
            bSendingString = false,
            bInit = false,
            iID = 0
        ;


        //# Returns a promise interface that uses .postMessage
        function promise(sType, oContext /*, bInContext, $sandboxWin*/) {
            //# Pull the $sandboxWin from the passed arguments
            //#     NOTE: Since .looperFactory or .promise are called based on the scope, both have to conform to an argument list while both have differing requirements. arguments[2] (aka bInContext) is used by looperFactory while arguments[3] (aka $sandboxWin) is used by promise. Further, in order to avoid unused variables/JSHint complaints, we need to collect $sandboxWin from the arguments
            var $sandboxWin = arguments[3];

            //# If we we have not yet .init'd .postMessage under our own _window, do so now
            //#     NOTE: The looping logic is contained below allowing us to run multiple statements in order and without needing to track that all callbacks have been made
            //#     NOTE: Due to the nature of .$sandbox and the code below, the eval'uated code is exposed to only the "s" variable in the .global and .local functions
            if (!bInit) {
                bInit = true;

                //# Ensure the .addEventListener interface is setup/polyfilled then .addEventListener under our _window so we can recieve the .postMessage's
                _window.addEventListener = _window.addEventListener || function (e, f) { _window.attachEvent('on' + e, f); };
                _window.addEventListener("message",
                    function (oMessage) {
                        var oData;

                        //# Ensure bSendingString has been setup then collect our oData
                        //#     NOTE: IE8-9 do not allow the transmission of objects via .postMessage, so we have to JSON.stringify/.parse in their case (or any other case where objects aren't sent), thankfully IE8-9 support JSON!
                        bSendingString = $services.is.str(oMessage.data);
                        oData = (bSendingString ? _window.JSON.parse(oMessage.data) : oMessage.data);

                        //# If the .origin is null and we have the .id within our .promises
                        //#     NOTE: Non-"allow-same-origin" sandboxed IFRAMEs return "null" rather than a valid .origin so we need to check the .source before accepting any .postMessage's
                        if (oMessage.origin === "null" && a_fnPromises[oData.id]) {
                            //# Fire the fnCallback stored in .promises (and protected by validating the .source), passing back the .r(esult) and the .arg(ument) then delete it from .promises
                            //#     NOTE: Filtering based on .source/$targetWin is done within the .promises functions
                            a_fnPromises[oData.id](
                                oMessage.source,
                                {
                                    results: oData.r,
                                    errors: oData.e,
                                    js: oData.js
                                },
                                oData.arg
                            );
                            delete a_fnPromises[oData.id];
                        }
                    },
                    false
                );

                //# .postMessage to ourselves so we can ensure bSendingString has been setup (targetDomain'ing * to ensure we can target ourselves)
                try {
                    _window.postMessage({}, "*");
                } catch (e) {
                    bSendingString = true;
                }
            }

            //# Return the promise to the caller
            return function (vJS, oInject, bReturnObject) {
                var bAsArray = $services.is.arr(vJS);

                return {
                    then: function (fnCallback, sArg) {
                        var oData = {
                            js: (bAsArray ? vJS : [vJS]),
                            id: iID++,
                            arg: sArg,
                            type: sType,
                            context: oContext,
                            inject: oInject
                        };

                        //# Set our fnCallback within .promises, filtering by $sandboxWin to ensure we trust the $source
                        a_fnPromises[iID] = function ($source, oResults, sArg) {
                            if ($source === $sandboxWin) {
                                //# If we are supposed to bReturnObject return our oReturnVal, else only return the .results (either bAsArray or just the first index)
                                fnCallback(
                                    (bReturnObject ? oResults : (bAsArray ? oResults.results : oResults.results[0])),
                                    sArg
                                );
                            }
                        };

                        //# .postMessage to our $sandboxWin (post-incrementing .id as we go and targetDomain'ing * so we reach our non-"allow-same-origin")
                        $sandboxWin.postMessage(
                            (bSendingString ? _window.JSON.stringify(oData) : oData),
                            "*"
                        );
                    }
                };
            };
        } //# promise


        //# Wires up a sandbox within the passed $iframe
        //#     NOTE: http://www.html5rocks.com/en/tutorials/security/sandboxed-iframes/#privilege-separation , https://developer.mozilla.org/en-US/docs/Web/API/window.postMessage
        function sandboxFactory($iframe) {
            var $sandboxWin = $iframe.contentWindow,
            //# Set bUsePostMessage and fnProcess based on the presence of allow-same-origin and .postMessage
            //#     NOTE: There is no need for a bFailover to add "allow-same-origin" if .postMessage isn't supported as both of these features are modern and either supported in pair or not
                bUsePostMessage = (_window.postMessage && ($iframe.getAttribute("sandbox") + "").indexOf("allow-same-origin") === -1),
                fnProcess = (bUsePostMessage ? promise : $factories.looper)
            ;

            //# Return the sandbox interface to the caller
            return {
                iframe: $iframe,
                window: $sandboxWin,
                secure: bUsePostMessage,

                //# Global/Isolated eval interface within the sandbox
                //#     NOTE: There is no point to pass a $window here as we use the passed $iframe's .contentWindow
                global: function (bFallback /*, $window*/) {
                    var sInterface = (bFallback ? "isolated" : "global");

                    return fnProcess(
                        (bUsePostMessage ? sInterface : $sandboxWin.$sandbox[sInterface]),
                        $sandboxWin
                        //, false
                    );
                },

                //# Local/Context eval interface within the sandbox
                local: function (oContext) {
                    var bContextPassed = (arguments.length === 1),
                        sInterface = (bContextPassed ? "context" : "local")
                    ;

                    return fnProcess(
                        (bUsePostMessage ? sInterface : $sandboxWin.$sandbox[sInterface]),
                        oContext || $sandboxWin,
                        bContextPassed,
                        $sandboxWin
                    );
                }
            };
        } //# sandboxFactory


        //# Return the sandbox factory to the caller
        return function (v1, v2, v3) {
            //# Determine how many arguments were passed and process accordingly
            switch (arguments.length) {
                //# If we are called with nutin' setup a new non-"allow-same-origin"'d $iframe
                case 0: {
                    sandboxFactory($factories.iframe("allow-scripts", "" /*, undefined*/));
                    break;
                }
                    //# If we were called with an $iframe
                case 1: {
                    sandboxFactory(v1);
                    break;
                }
                    //# If we were called with a sSandboxAttr, sURL and optional $domTarget
                case 2:
                case 3: {
                    sandboxFactory($factories.iframe(v1, v2, v3));
                    break;
                }
            }
        }; //# return
    }
    //# </EvalerJS>
);


//# Stub for $.CjsSS
//(function ($) {
//    //# jQuery extension to enable Javascript within CSS
//    $.fn.extend({
//        cjsss: function (oOptions) {
//            return this.each(function () {
//                // Do something to each element here.
//            });
//        }
//    }); //# $.fn.cjsss

//    //# Create the jQuery $.cjsss interface to update the default options
//    $.extend({
//        cjsss: {
//            options: {},
//            process: {},
//            services: {}
//        }
//    });
//})(jQuery);
