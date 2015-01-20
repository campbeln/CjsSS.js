/*
CjsSS.js v0.5f (kk) http://opensourcetaekwondo.com/cjsss/
(c) 2014-2015 Nick Campbell cjsssdev@gmail.com
License: MIT
Add in a library such as Chroma (https://github.com/gka/chroma.js) to get color functionality present in LESS and Sass.
*/
(function (_window, _document, fnEvalerFactory, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory) {
    "use strict";

    var bExposed = false,
        cjsss = "cjsss",
        reScript = /<script.*?>([\s\S]*?)<\/script>/gi,
        $cjsss = {
            options: {
                selector: "[" + cjsss + "], [data-" + cjsss + "]",      //# STRING (CSS Selector);
                optionScope: "json",                                    //# STRING (enum: json, global, local, object, sandbox); 
                expose: false,                                          //# BOOLEAN; Set window.cjsss?
                async: true,                                            //# BOOLEAN; Process LINK tags asynchronously?
                scope: "isolated",                                      //# STRING (enum: global, local, object, sandbox); Javascript scope to evaluate code within.
                crlf: "",                                               //# STRING; Character(s) to append to the end of each line of `mixin`-processed CSS.
                d1: "{{", d2: "}}"                                      //# STRING; Delimiters denoting embedded Javascript variables (d1=start, d2=end).
            },
            services: {},

            version: "v0.5f (kk)",
            data: {
                services: {},
                inject: {},
                cache: {}
            },

            //#     NOTE: We implement .process and .inject with .apply below to ensure that these calls are always routed to the version under _window[cjsss].services (else a developer updating _window[cjsss].services.process would also have to update _window[cjsss].process)
            process: function () {
                $cjsss.services.process.apply(this, arguments);
            },
            inject: function () {
                $cjsss.services.inject.apply(this, arguments);
            }
        },
        oDefaults = $cjsss.options,         //# Include these alias variables for improved code minimization
        $services = $cjsss.services,
        oCache = $cjsss.data.cache,
        oInjections = $cjsss.data.inject,
        _Object_prototype_toString = Object.prototype.toString
    ;


    //# Autorun functionality
    $services.autorun = function () {
        //# If we have a .selector then we need to .process them (using the default options of .process)
        //#     NOTE: We pass in the .selector as the first argument of .process to allow the developer to set it to an array of DOM objects if they so choose
        if (oDefaults.selector) {
            $services.process(oDefaults.selector);
        }
        //# Else we'll need to .expose ourselves (otherwise the developer won't have access our functionality)
        else {
            //oDefaults.expose = true;
            $services.expose();
        }
    };
    

    //# DOM querying functionality (defaulting to jQuery if it's present on-page)
    //#     NOTE: Include cjsss.polyfill.js or jQuery to support document.querySelectorAll on IE7 and below, see: http://quirksmode.org/dom/core/ , http://stackoverflow.com/questions/20362260/queryselectorall-polyfill-for-all-dom-nodes
    $services.dom = _window.jQuery || function (sSelector) {
        //# Wrap the .querySelectorAll call in a try/catch to ensure older browsers don't throw errors on CSS3 selectors
        //#     NOTE: We are not returning a NodeList on error, but a full Array (which could be confusing for .services developers if they are not careful).
        try { return _document.querySelectorAll(sSelector); }
        catch (e) { return []; }
    };


    //# Exposes our functionality under the _window
    $services.expose = function () {
        //# If we've not yet been bExposed
        if (!bExposed) {
            bExposed = true;

            //# .extend the current _window[cjsss] (if any) with the internal $cjsss, resetting both to the new .extend'ed object
            //#     NOTE: oDefaults and $services are .extended in the procedural code below, so there is no need to so it again here
            $cjsss = _window[cjsss] = $services.extend(_window[cjsss], $cjsss);

            //# Ensure that $cjsss is also .inject'd into any IFRAMEs
            //#     TODO: Is this a correct assumption? This will cause issues with .postMessage'd IFRAMEs
            $services.inject(cjsss, $cjsss);
        }
    }; //# $services.expose


    //# Extends the passed oTarget with the additionally passed N objects
    //#     NOTE: Right-most object (last argument) wins
    //#     NOTE: We do not take jQuery's .extend because this implementation of .extend always does a deep copy
    $services.extend = function (oTarget) {
        var i, sKey;

        //# Ensure the passed oTarget is an object
        oTarget = ($services.is.obj(oTarget) ? oTarget : {});
        
        //# Traverse the N passed arguments, appending/replacing the values from each into the oTarget (recursing on .is.obj)
        //#     NOTE: i = 1 as we are skipping the oTarget
        for (i = 1; i < arguments.length; i++) {
            if ($services.is.obj(arguments[i])) {
                for (sKey in arguments[i]) {
                    if (arguments[i].hasOwnProperty(sKey)) {
                        oTarget[sKey] = ($services.is.obj(arguments[i][sKey])
                            ? $services.extend(oTarget[sKey], arguments[i][sKey])
                            : arguments[i][sKey]
                        );
                    }
                }
            }
        }

        //# For convenience, return the oTarget to the caller (to allow for `objX = $service.extend({}, obj1, obj2)`-style calls)
        return oTarget;
    }; //# $services.extend


    //# Wrapper for a GET AJAX call
    $services.get = function (sUrl, bAsync, vCallback) {
        var XHRConstructor = (XMLHttpRequest || ActiveXObject),
            $xhr
        ;

        //# IE5.5+ (ActiveXObject IE5.5-9), based on http://toddmotto.com/writing-a-standalone-ajax-xhr-javascript-micro-library/
        try {
            $xhr = new XHRConstructor('MSXML2.XMLHTTP.3.0');
        } catch (e) { }

        //# If a function was passed rather than an object, object-ize it (else we assume it's an object with at least a .fn)
        if ($services.is.fn(vCallback)) {
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
    };


    //# Collects the SCRIPT blocks within the passed sCSS, returning the eval stack
    $services.getScripts = function(sCSS) {
        var $src, i,
            a_sReturnVal = sCSS.match(reScript) || [],
            reDeScript = /<[\/]?script.*?>/gi,
            reScriptSrc = /<script.*?src=['"](.*?)['"].*?>/i,
            fnCallback = function(bSuccess, sJS, iIndex) {
                a_sReturnVal[iIndex] = (bSuccess ? sJS : "");
            }
        ;
        //# Traverse the extracted SCRIPT tags from the .css (if any)
        for (i = 0; i < a_sReturnVal.length; i++) {
            $src = reScriptSrc.exec(a_sReturnVal[i]);

            //# If there is an $src in the SCRIPT tag, .get the resulting js synchronously (as order of SCRIPTs matter)
            if ($src && $src[1]) {
                $services.get($src[1], false, {
                    fn: fnCallback,
                    arg: i
                });
            }
                //# Else this is an inline SCRIPT tag, so load the reDeScript'd code into the a_sReturnVal eval stack
            else {
                a_sReturnVal[i] = a_sReturnVal[i].replace(reDeScript, "");
            }
        }

        //# Return our a_sReturnVal to the caller
        return a_sReturnVal;
    }; //# $services.getScripts


    //# Datatype checking functionality
    $services.is = {
        str: function(s) {
            //# NOTE: This function also treats a 0-length string (null-string) as a non-string
            return ((typeof s === 'string' || s instanceof String) && s !== '');
        },
        fn: function (f) {
            return (_Object_prototype_toString.call(f) === '[object Function]');
        },
        obj: function (o) {
            return (o && o === Object(o) && !$services.is.fn(o));
        },
        arr: function (a) {
            return (_Object_prototype_toString.call(a) === '[object Array]');
        }
    };


    //# Injects the passed variant (exposed as the passed sVarName) to all non-JSON eval'uated code
    $services.inject = function (sVarName, variant) {
        var bReturnVal = $services.is.str(sVarName);

        //# If the passed sVarName .is.str(ing), set the passed variant into our oInjections
        if (bReturnVal) {
            oInjections[sVarName] = variant;
        }
        return bReturnVal;
    };


    //# Returns the mixin function
    //#     NOTE: We require a factory here so that sCRLF is settable across all function calls
    $services.mixinFactory = function (sCrLf) {
        return function (oObj, vSelector) {
            var sReturnVal = "";

            //# If the passed oObj .is.obj
            if ($services.is.obj(oObj)) {
                sReturnVal = (vSelector ? ($services.is.str(vSelector) ? vSelector : oObj._selector) + " {" : "") + sCrLf +
                    $services.toCss(oObj, sCrLf) + sCrLf +
                    (vSelector ? "}" : "")
                ;
            }
            return sReturnVal;
        };
    };


    //# Transforms the passed object into an inline CSS string (e.g. `color: red;\n`)
    //#     NOTE: This function recurses if it finds an object
    $services.toCss = function (oObj, sCrLf) {
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
                if ($services.is.obj(vEntry)) {
                    sReturnVal += $services.toCss(vEntry, sCrLf);
                }
                //# Else we assume this is a stringable-based vEntry
                else {
                    sReturnVal += sKey + ":" + vEntry + ";" + sCrLf;
                }
            }
        }

        return sReturnVal;
    }; //# $services.toCss


    //# Returns an unused sPrefix'ed HTML ID
    //#     NOTE: sPrefix must begin with /A-Za-z/
    $services.newId = function(sPrefix) {
        var sRandom;
        sPrefix = sPrefix || cjsss + "_";

        //# Do...while the sPrefix + sRandom exists as an ID in the _document, try to find a unique ID returning the first we find
        do {
            sRandom = Math.random().toString(36).substr(2, 5);
        } while (_document.getElementById(sPrefix + sRandom));
        return sPrefix + sRandom;
    };

    
    //# Processes the CSS within the passed vElements using the provided oOptions (overriding any previously set)
    $services.process = function (vElements, oOptions) {
        var i, $current, sAttrName, sOptions, sID,
            $elements = [],
            o = $services.extend({}, oDefaults, oOptions),
            fnHasAttribute = function (s) { return typeof this[s] !== 'undefined'; },
            fnCallback = function (bSuccess, sCSS, oData) {
                //# If the call was a bSuccess, setup the new $style tag
                if (bSuccess) {
                    var $style = _document.createElement('style');
                    $style.type = "text/css"; //# $style.setAttribute("type", "text/css");
                    $style.setAttribute(oData.attr, oData.$link.getAttribute(oData.attr) || "");

                    //# Replace the .$link with the new $style, then copy across the .id
                    oData.$link.parentNode.replaceChild($style, oData.$link);
                    $style.id = oData.id;

                    //# Set the .css into the oCache then .processCSS
                    oCache[oData.id].css = sCSS;
                    prepLinkStyle(sID);
                    $services.processCSS(
                        $style,
                        o
                        //,false
                    );
                }
            }
        ;
        
        //# Populates the o(ptions) and oCache for LINK and STYLE tags
        function prepLinkStyle(sID, sCSS) {
            //# If the passed sID hasn't been oCache'd, do so now
            if (!oCache[sID]) {
                //# Setup the oCache entry for the sID
                oCache[sID] = {
                    //run: ,
                    //evaler: $services.evalFactory[o.scope](),
                    scripts: $services.getScripts(sCSS),
                    id: sID,
                    css: sCSS,
                    options: $services.evalFactory[o.optionScope]()(sOptions)
                };

                //# Recollect our o(ptions) in the proper priority order (right-most wins)
                o = $services.extend({}, oDefaults, oCache[sID].options);

                //# Now that our full o(ptions) have been setup, set our .run and .evaler
                //#     TODO: Should do $services.dom("[cjsss],[data-cjsss]") call to setup the oCache!?
                oCache[sID].run = (o.scope === "local" || o.scope === "useStrict" ? -1 : 1);
                oCache[sID].evaler = $services.evalFactory[o.scope]();
            }

            //# Recollect our o(ptions) in the proper priority order (right-most wins)
            o = $services.extend({}, oDefaults, oCache[sID].options, oOptions);

            //# If we have been told to .expose ourselves, so do now (before we run any code below)
            if (o.expose) {
                $services.expose();
            }

            //# Rebuild the .mixinFactory with the supplied .crlf, re-.inject'ing it into our oInjections
            $services.inject("mixin", $services.mixinFactory(o.crlf));
        }


        //# If a truthy vElements was passed
        if (vElements) {
            //# If the passed vElements is CSS Selector(-ish), select the $elements now
            if ($services.is.str(vElements)) {
                $elements = $services.dom(vElements);
            }
            //# Else ensure $elements is an array-like object
            //#     NOTE: Since a NodeList is not a native Javascript object, .hasOwnProperty doesn't work
            else {
                $elements = (vElements[0] && vElements.length ? vElements : [vElements]);
            }
        }
        //# Else if we have a .selector, reset the $elements accordingly
        else if ($services.is.str(o.selector)) {
            $elements = $services.dom(o.selector);
        }

        //# Traverse the $elements (if any)
        for (i = 0; i < $elements.length; i++) {
            //# Reset the values for this loop
            $current = $elements[i];
            $current.hasAttribute = $current.hasAttribute || fnHasAttribute; //# .hasAttribute is IE8+ only, hence the polyfill
            sAttrName = ($current.hasAttribute("data-" + cjsss) ? "data-" : "") + cjsss;
            sOptions = $current.getAttribute(sAttrName) || "{}";

            //# Ensure the $current $elements has an .id
            sID = $current.id = $current.id || $services.newId();

            //# Determine the .tagName and process accordingly
            //#     NOTE: We utilize the oCache below so that we can re-process the CSS if requested, else we loose the original value when we reset innerHTML
            switch ($current.tagName.toLowerCase()) {
                case "style": {
                    //# prepLinkStyle then .processCSS
                    prepLinkStyle(sID, $current.innerHTML);
                    $services.processCSS(
                        $current,
                        o
                        //,false
                    );
                    break;
                }
                case "link": {
                    //# prepLinkStyle, passing in our sID only (as we need to collect our CSS via AJAX)
                    prepLinkStyle(sID);

                    //# Collect the css from the LINK's href'erenced file
                    //#     NOTE: We use .href rather than .getAttribute("href") because .href is a fully qualified URI while .getAttribute returns the set string
                    $services.get($current.href, o.async, {
                        fn: fnCallback,
                        arg: { $link: $current, attr: sAttrName, id: sID, o: o }
                    });
                    break;
                }
                default: {
                    //# If the $current sID hasn't been oCache'd, do so now
                    if (!oCache[sID]) {
                        //# Setup the oCache entry for this tag while ensuring sOptions is an object definition before creation
                        oCache[sID] = {
                            //parent: setBelow,
                            id: sID,
                            css: $current.getAttribute("style"),
                            options: $services.evalFactory[o.optionScope]()(
                                (sOptions.indexOf("{") === 0 ? sOptions : '{ "selector": "' + sOptions + '" }')
                            )
                        };
                    }

                    //# Recollect our o(ptions) in the proper priority order (right-most wins) then collect our .parent
                    o = $services.extend({}, oDefaults, oCache[sID].options, oOptions);
                    oCache[sID].parent = oCache[$services.dom(o.selector)[0].id];

                    //# If we found our .parent's oCache entry
                    if (oCache[sID].parent) {
                        //#
                        $services.processCSS(
                            $current,
                            $services.extend({}, oDefaults, oCache[sID].parent.options, oCache[sID].options, oOptions),
                            true
                        );
                    }
                    //# Else we were unable to find the .parent, so .warn
                    else {
                        $services.warn("Unable to locate parent element for: ", $current);
                    }
                }
            } //# switch()
        } //# for()

        //# Return the $elements to the caller (for easier debugging if nothing is selected)
        return $elements;
    }; //# $services.process()


    //# Processes the CSS associated with the passed $element
    $services.processCSS = function($element, oOptions, bSetAttribute) {
        var i, a_sToken, sProcessedCSS,
            a_sJS = [],
            vResults = $element.id,                                             //# Borrow the use of vResults to store the .id
            oElementCache = oCache[vResults].parent || oCache[vResults],        //# Default to the .parent (if any) as we primarily use its data below
            a_sTokenized = oCache[vResults].css                                 //# Source .css from the passed $element, not from its .parent
                .replace(reScript, "")                                          //# Remove the SCRIPTs (so we don't have extra delimiters that get wrongly a_sTokenized)
                .replace(new RegExp("/\\*" + oOptions.d1, "g"), oOptions.d1)    //# Replace any commented delimiters with non-delimitered versions
                .replace(new RegExp(oOptions.d2 + "\\*/", "g"), oOptions.d2)    //#     TODO: Move to setting .css?
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
                $services.warn("Errors occured processing the Javascript for: ", $element, oResults.errors);
            }
        } //# callback
    

        //# If we haven't .run the .scripts yet (or we are to always .run because they fall out of scope)
        //#     NOTE: If we need to .run once, .run is set to 1 then decremented to 0 after the first .run. If we are supposed to .run every time it is set to -1 and decremeneted every time below 0
        if (oElementCache.run !== 0) {
            //# Decrement .run and reset a_sJS to the .scripts
            oElementCache.run--;
            a_sJS = oElementCache.scripts;
            console.log(".run'in");
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
        ($services.is.fn(vResults.then) ? vResults.then(callback) : callback(vResults));
    }; //# $services.processCSS


    //# Safely warns the user on the console
    $services.warn = function (s, v1, v2) {
        var c = console;
        (c ? (c.warn || c.log) : function () { })(cjsss + ": " + s, v1, v2 || "");
    }; //# $services.warn



    //####################
    //# "Procedural" code
    //####################
    //# Before importing any external functionality, copy the original $service function references into .data.services
    $cjsss.data.services = $services.extend({}, $services);
    
    //# If the developer has already setup a _window[cjsss] object
    //#     NOTE: These first calls to .is.obj, .is.fn and .extend are the only non-overridable pieces of code in CjsSS!
    if ($services.is.obj(_window[cjsss])) {
        //# If the developer has provided a servicesFactory, .extend it's results over our own $services
        if ($services.is.fn(_window[cjsss].servicesFactory)) {
            $services.extend($services, _window[cjsss].servicesFactory($cjsss));
        }

        //# .extend any developer .options over our oDefaults
        $services.extend(oDefaults, _window[cjsss].options);
    }
    
    //# Build the passed fnEvalerFactory (if one hasn't been set already)
    //#     NOTE: The fnEvalerFactory is specifically placed outside of the "use strict" block to allow for the local eval calls below to persist across eval'uations
    $services.evalFactory = $services.evalFactory || fnEvalerFactory(_window, _document, $services, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory);

    //# Now .autorun
    $services.autorun();
})(
    window,
    document,
    //# <EvalerJS>
    //# fnEvalerFactory function. Base factory for the evaler logic
    function (_window, _document, $services, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory) {
        "use strict";

        var fnJSONParse,
            sVersion = "v0.5e",
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
                //#     NOTE: A function defined by a Function() constructor does not inherit any scope other than the global scope (which all functions inherit), even though we are not using this paticular feature (as getGlobalEvaler get's the global version of eval)
            else if (fnGlobalEvaler === null) {
                fnGlobalEvaler = new Function(sGetGlobalEval)();
            }
        } //# getGlobalEvaler


        //# Factory function that configures and returns a looper function for the passed fnEval and oContext
        function looperFactory(fnEval, oContext, bInContext) {
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

                //# If we have a oContext and the passed oInject .is.obj
                if (oContext && bInjections) {
                    //# Traverse oInject, setting each .hasOwnProperty into the oContext (leaving oContext's current definition if there is one)
                    for (i in oInject) {
                        if (oContext[i] === undefined && oInject.hasOwnProperty(i)) {
                            oContext[i] = oInject[i];
                        }
                    }
                }

                //# Determine the type of fnEval and process accordingly
                switch (fnEval) {
                    case fnLocalEvaler:
                    case fnUseStrictEvaler: {
                        //# As this is either a fnLocalEvaler or fnUseStrictEvaler, we need to let them traverse the .js and non-oContext oInject'ions, so call them accordingly
                        //#     NOTE: oReturnVal is updated byref, so there is no need to collect a return value
                        fnEval(oReturnVal, i, {
                            inject: (!bInContext && bInjections ? oInject : {}),
                            context: (bInContext ? oContext : undefined)
                        });
                        break;
                    }
                    default: {
                        //# Traverse the .js, .pushing each fnEval .results into our oReturnVal (optionally .call'ing bInContext if necessary as we go)
                        for (i = 0; i < oReturnVal.js.length; i++) {
                            try {
                                oReturnVal.results.push(bInContext ? fnEval.call(oContext, oReturnVal.js[i]) : fnEval(oReturnVal.js[i]));
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
            sSandboxAttr = (sSandboxAttr === null
                ? ''
                : ' sandbox="' + (sSandboxAttr ? sSandboxAttr : "allow-scripts") + '"'
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
            var fnEvaler,
                bContextPassed = (oContext !== undefined && oContext !== null)
            ;

            //# Default the oContext to _window if it wasn't passed
            oContext = (bContextPassed ? oContext : _window);

            //# Determine the eMode and process accordingly
            switch (eMode/*.substr(0, 1).toLowerCase()*/) {
                //# global
                case "g": {
                    //# If this is a request for the current _window
                    if (oContext === _window) {
                        //# Ensure the fnGlobalEvaler has been setup, then safely set it (or optionally fnLocalEvaler if we are to .f(allback)) into fnEvaler
                        getGlobalEvaler();
                        fnEvaler = (!fnGlobalEvaler && oConfig.f ? fnLocalEvaler : fnGlobalEvaler);

                        //# If we were able to collect an fnEvaler above, return the configured looper
                        if (fnEvaler) {
                            return looperFactory(fnEvaler, _window/*, false*/);
                        }
                    }
                        //# Else if the passed oContext has an .eval function
                    else if ($services.is.fn(oContext.eval)) {
                        //# Attempt to collect the foreign fnGlobalEvaler, then safely set it (or optionally the foreign fnLocalEvaler if we are to .f(allback)) into fnEvaler
                        fnEvaler = oContext.eval("(function(){" + getGlobalEvaler(true) + "})()");
                        fnEvaler = (!fnEvaler && oConfig.f ? function (/* sJS */) { return oContext.eval(arguments[0]); } : fnEvaler);

                        //# If we were able to collect an fnEvaler above, return the configured looper (or the fnEvaler if this is a .r(ecursiveCall))
                        if (fnEvaler) {
                            return (oConfig.r ? fnEvaler : looperFactory(fnEvaler, oContext/*, false*/));
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
                    return looperFactory(fnLocalEvaler, oContext, bContextPassed);
                    //break;
                }
                    //# "use strict"
                case "u": {
                    return looperFactory(fnUseStrictEvaler, oContext, bContextPassed);
                    //break;
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
                    return looperFactory(fnEvaler, (bContextPassed ? oContext : oConfig.window), bContextPassed);
                    //break;
                }
                    //# json
                case "j": {
                    //# JSON.parse never allows for oInject'ions nor a oContext, so never pass a oContext into the .looperFactory (which in turn locks out oInject'ions)
                    return looperFactory(fnJSONParse/*, undefined, false*/);
                    //break;
                }
            }
        } //# evalerFactory


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
            version: sVersion,
            global: function (bFallback, $window) {
                return evalerFactory("g", $window || _window, { f: bFallback });
            },
            local: function (oContext) {
                return evalerFactory("l", oContext /*, {}*/);
            },
            useStrict: function (oContext) {
                return evalerFactory("u", oContext /*, {}*/);
            },
            isolated: function (oContext, oReturnedByRef) {
                return evalerFactory("i", oContext, oReturnedByRef);
            },
            json: (!fnJSONParse ? undefined : function () {
                return evalerFactory("j" /*, undefined, {}*/);
            }),
            sandbox: (!fnSandboxEvalerFactory
                ? undefined
                : fnSandboxEvalerFactory(_window, $services, { looper: looperFactory, iframe: iframeFactory })
            )
        };
    },
    //# fnLocalEvaler function. Placed here to limit its scope and local variables as narrowly as possible (hence the use of arguments[0])
    function (/* oData, i, oMetaData */) {
        //# Traverse the .inject'ions, setting each as a local var as we go
        for (arguments[1] in arguments[2].inject) {
            if (arguments[2].inject.hasOwnProperty(arguments[1])) {
                eval("var " + arguments[1] + "=arguments[2].inject[arguments[1]];");
            }
        }

        //# Setup the local .evaler under the passed oMetaData (aka arguments[2])
        arguments[2].evaler = function (/* sJS */) {
            return eval(arguments[0]);
        };

        //# Traverse the .js, processing each entry as we go
        for (arguments[1] = 0; arguments[1] < arguments[0].js.length; arguments[1]++) {
            try {
                arguments[0].results.push(arguments[2].context
                    ? arguments[2].evaler.call(arguments[2].context, arguments[0].js[arguments[1]])
                    : eval(arguments[0].js[arguments[1]])
                );
            } catch (e) {
                //# An error occured fnEval'ing the current i(ndex), so .push undefined into this i(ndex)'s entry in .results and log the .errors
                arguments[0].results.push(undefined);
                arguments[0].errors.push({ index: arguments[1], error: e, js: arguments[0].js[arguments[1]] });
            }
        }

        //# Return the modified arguments[0] to the caller
        //#     NOTE: As this is modified byref there is no need to actually return arguments[0]
        //return arguments[0];
    },
    //# fnUseStrictEvaler function. Placed here to limit its scope and local variables as narrowly as possible (hence the use of arguments[0])
    //#     NOTE: Since we cannot conditionally invoke strict mode (see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#Invoking_strict_mode) we need 2 implementations for fnLocalEvaler and fnUseStrictEvaler
    function (/* oData, i, oMetaData */) {
        //# Traverse the .inject'ions, setting each as a local var as we go
        //#     NOTE: We do this outside of the "use strict" function below so we don't need to pollute the global context while still having persistent var's across eval'uations (which "use strict" doesn't allow)
        for (arguments[1] in arguments[2].inject) {
            if (arguments[2].inject.hasOwnProperty(arguments[1])) {
                eval("var " + arguments[1] + "=arguments[2].inject[arguments[1]];");
            }
        }

        //# Setup the internal function with "use strict" in place
        (function () {
            "use strict";

            //# Setup the local .evaler under the passed oMetaData (aka arguments[2])
            arguments[2].evaler = function (/* sJS */) {
                return eval(arguments[0]);
            };

            //# Traverse the .js, processing each entry as we go
            for (arguments[1] = 0; arguments[1] < arguments[0].js.length; arguments[1]++) {
                try {
                    arguments[0].results.push(arguments[2].context
                        ? arguments[2].evaler.call(arguments[2].context, arguments[0].js[arguments[1]])
                        : eval(arguments[0].js[arguments[1]])
                    );
                } catch (e) {
                    //# An error occured fnEval'ing the current i(ndex), so .push undefined into this i(ndex)'s entry in .results and log the .errors
                    arguments[0].results.push(undefined);
                    arguments[0].errors.push({ index: arguments[1], error: e, js: arguments[0].js[arguments[1]] });
                }
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
        function promise(sType, oContext, bUnused, $sandboxWin) {
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

                        //# Ensure bSendingString has been setup
                        //#     NOTE: IE8-9 do not allow the tranmission of objects via .postMessage, so we have to JSON.stringify/.parse in their case (or any other case where objects aren't sent), thankfully IE8-9 support JSON!
                        bSendingString = $services.is.str(oMessage.data);

                        //# If the .origin is null and we have the .id within our .promises
                        //#     NOTE: Non-"allow-same-origin" sandboxed IFRAMEs return "null" rather than a valid .origin so we need to check the .source before accepting any .postMessage's
                        if (oMessage.origin === "null" && a_fnPromises[oData.id]) {
                            //# Collect our oData
                            oData = (bSendingString ? _window.JSON.parse(oMessage.data) : oMessage.data);

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

                        //# .postMessage to our $sandboxWin (post-incrementating .id as we go and targetDomain'ing * so we reach our non-"allow-same-origin")
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
