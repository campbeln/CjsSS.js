/*
CjsSS.js v0.5 (kk) http://opensourcetaekwondo.com/cjsss
(c) 2014 Nick Campbell cjsssdev@gmail.com
License: MIT
Add in a library such as Chroma (https://github.com/gka/chroma.js) to get color functionality present in LESS and Sass.
*/
(function ($win, $doc, fnEvalFactory) {
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
                scope: "sandbox",                                       //# STRING (enum: global, local, object, sandbox); Javascript scope to evaluate code within.
                crlf: "",                                               //# STRING; Character(s) to append to the end of each line of `mixin`-processed CSS.
                d1: "/*{{", d2: "}}*/"                                  //# STRING; Delimiters denoting embedded Javascript variables (d1=start, d2=end).
            },
            services: {},

            version: "v0.5 (kk)",
            data: {
                services: {},
                inject: {},
                cache: {}
            },

            //#     NOTE: We implement .process and .inject with .apply below to ensure that these calls are always routed to the version under $win[cjsss].services (else a developer updating $win[cjsss].services.process would also have to update $win[cjsss].process)
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
        oInjections = $cjsss.data.inject
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
    $services.dom = $win.jQuery || function (sSelector) {
        //# Wrap the .querySelectorAll call in a try/catch to ensure older browsers don't throw errors on CSS3 selectors
        //#     NOTE: We are not returning a NodeList on error, but a full Array (which could be confusing for .services developers if they are not careful).
        try { return $doc.querySelectorAll(sSelector); }
        catch (e) { return []; }
    };


    //# Exposes our functionality under the $win(dow)
    $services.expose = function () {
        //# If we've not yet been bExposed
        if (!bExposed) {
            bExposed = true;

            //# .extend the current $win[cjsss] (if any) with the internal $cjsss, resetting both to the new .extend'ed object
            //#     NOTE: oDefaults and $services are .extended in the procedural code below, so there is no need to so it again here
            $cjsss = $win[cjsss] = $services.extend($win[cjsss], $cjsss);

            //# Ensure that $cjsss is also .inject'd into any sandboxes
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

        //# IE5.5+, Based on http://toddmotto.com/writing-a-standalone-ajax-xhr-javascript-micro-library/
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


    //# Datatype checking functionality
    $services.is = {
        str: function(s) {
            //# NOTE: This function also treats a 0-length string (null-string) as a non-string
            return ((typeof s === 'string' || s instanceof String) && s !== '');
        },
        fn: function (f) {
            return (Object.prototype.toString.call(f) === '[object Function]');
        },
        obj: function (o) {
            return (o && o === Object(o) && !$services.is.fn(o));
        },
        arr: function (a) {
            return (Object.prototype.toString.call(a) === '[object Array]');
        }
    };


    //# Injects the passed variant (exposed as the passed sVarName) to all non-JSON eval'uated code
    $services.inject = function (sVarName, variant) {
        var bReturnVal = $services.is.str(sVarName);
        if (bReturnVal) {
            oInjections[sVarName] = variant;
        }
        return bReturnVal;
    };
    /*
    //# The version below has been religated to the "too hard" basket, as external script references added into the $iFrame would need to be hooked to verify .onload before the eval's could be run, and while there are cross-browser ways to do this, they are not very nice or short. Besides, the developer could implement one of the documented ways to accomplish this themselves (likely a good plugin candidate).
    $services.inject = function (str, variant) {
        var reScript = /^(\s)*?<script .*?>(\s)*?$/i,
            bReturnVal = $services.is.str(str)
        ;

        //# If the passed str is.str, determine if it's a .scripts request or a .vars request
        if (bReturnVal) {
            (reScript.test(str) && variant === undefined
                ? oInjections.scripts.push(str)
                : oInjections.vars[str] = variant
            )
        }

        return bReturnVal;
    };
    */


    //# Returns the mixin function
    //#     NOTE: We require a factory here so that sCRLF is settable across all function calls
    $services.mixinFactory = function (sCrLf) {
        return function (oObj, vSelector) {
            //# If the passed oObj .is.obj
            if ($services.is.obj(oObj)) {
                return (vSelector ? ($services.is.str(vSelector) ? vSelector : oObj._selector) + " {" : "") + sCrLf +
                    $services.toCss(oObj, sCrLf) + sCrLf +
                    (vSelector ? "}" : "")
                ;
            }
            else {
                return "";
            }
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

                //# If this vEntry is.obj(ect), recurse toCss() the sub-obj
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
    
    
    //# 
    $services.hasAttribute = function($element) {
        var i,
            c_oAttrs = $element.attributes,
            bReturnVal = false
        ;
        
        //# Return the function to the caller for the polyfill
        return function(sAttrName) {
            sAttrName = sAttrName.toLowerCase();
            for (i = 0; i < c_oAttrs.length; i++) {
                if (c_oAttrs[i].name.toLowerCase() === sAttrName) {
                    bReturnVal = true;
                    break;
                }
            }
            return bReturnVal;
        };
    }; //# $services.hasAttribute


    //#
    $services.newId = function(sPrefix) {
        var sRandom = Math.floor(Math.random() * 1000);

        //#
        sPrefix = sPrefix || cjsss;

        //#
        while (document.getElementById(sPrefix + sRandom)) {
            sRandom = Math.floor(Math.random() * 1000);
        }

        return sPrefix + sRandom;
    };

    
    //# Processes the CSS within the passed vElements using the provided oOptions (overriding any previously set)
    $services.process = function (vElements, oOptions) {
        var i, $current, sAttrName, sOptions, sID,
            $elements = [],
            o = $services.extend({}, oDefaults, oOptions),
            eOptionScope = o.optionScope,
            fnCallback = function (bSuccess, sCSS, oData) {
                //# If the call was a bSuccess, setup the new $style tag
                if (bSuccess) {
                    var $style = $doc.createElement('style');
                    $style.type = "text/css"; //# $style.setAttribute("type", "text/css");
                    $style.setAttribute(oData.attr, oData.$link.getAttribute(oData.attr) || "");

                    //# Replace the .$link with the new $style, then copy across the .id
                    oData.$link.parentNode.replaceChild($style, oData.$link);
                    $style.id = oData.id;

                    //# Set the .css into the oCache then .processCSS (while .processGetScripts as we go)
                    oCache[oData.id].css = sCSS;
                    prepLinkStyle(sID);
                    $services.processCSS(
                        $style,
                        o,
                        $services.processGetScripts(oData.id)
                        //,false
                    );
                }
            }
        ;

        //# Populates the o(ptions) and oCache for LINK and STYLE tags
        function prepLinkStyle(sID, sCSS) {
            var oContext;

            //# If the passed sID hasn't been oCache'd, do so now
            if (!oCache[sID]) {
                oContext = $services.evalFactory.context(o.scope);

                //# Setup the oCache entry for the sID
                oCache[sID] = {
                    //run: false,
                    id: sID,
                    css: sCSS,
                    options: $services.evalFactory.create(eOptionScope)(sOptions),
                    mode: oContext.mode,
                    evaler: $services.evalFactory.create(oContext.context)
                };
            }

            //# Recollect our o(ptions) in the proper priority order (right-most wins)
            o = $services.extend({},
                oDefaults,
                oCache[sID].options,
                oOptions
            );

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
            $current.hasAttribute = $current.hasAttribute || $services.hasAttribute($current);  //# .hasAttribute is IE8+ only, hence the polyfill
            sAttrName = ($current.hasAttribute("data-" + cjsss) ? "data-" : "") + cjsss;
            sOptions = $current.getAttribute(sAttrName) || "{}";

            //# Ensure the $current $elements has an .id
            sID = $current.id = $current.id || $services.newId();

            //# Determine the .tagName and process accordingly
            //#     NOTE: We utilize the oCache below so that we can re-process the CSS if requested, else we loose the original value when we reset innerHTML
            switch ($current.tagName.toLowerCase()) {
                case "style": {
                    //# prepLinkStyle then .processCSS (while .processGetScripts as we go)
                    prepLinkStyle(sID, $current.innerHTML);
                    $services.processCSS(
                        $current,
                        o,
                        $services.processGetScripts(sID)
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
                            //id: sID,
                            css: $current.getAttribute("style"),
                            options: $services.evalFactory.create(eOptionScope)(
                                (sOptions.indexOf("{") === 0 ? sOptions : '{ "selector": "' + sOptions + '" }')
                            )
                            //,mode: "based on parent.mode"
                            //,evaler: undefined
                        };
                    }

                    //# Pull the initial o(ptions) so we can get our oParent
                    o = $services.extend({}, oCache[sID].options, oOptions);
                    var oContext,
                        $parent = $services.dom(o.selector)[0],
                        oParent = oCache[$parent.id]
                    ;

                    //# If we found our oParent's oCache entry
                    if (oParent) {
                        //#
                        //oCache[sID].mode = oParent.mode;
                        oCache[sID].evaler = oParent.evaler;

                        //#
                        $services.processCSS(
                            $current,
                            $services.extend({}, oDefaults, oParent.options, oCache[sID].options, oOptions),
                            $services.processGetScripts(oParent.id),
                            true
                        );
                    }
                    //# Else we were unable to find the oParent, so .warn
                    else {
                        $services.warn("Unable to locate parent element for " + $current);
                    }
                }
            } //# switch()
        } //# for()

        //# Return the $elements to the caller (for easier debugging if nothing is selected)
        return $elements;
    }; //# $services.process()


    //# Collects the SCRIPT blocks within the passed sID's .css, returning the eval stack
    $services.processGetScripts = function(sID) {
        var $src, i, a_sJS,
            sMode = oCache[sID].mode,
            reDeScript = /<[\/]?script.*?>/gi,
            reScriptSrc = /<script.*?src=['"](.*?)['"].*?>/i,
            fnCallback = function(bSuccess, sJS, iIndex) {
                a_sJS[iIndex] = (bSuccess ? sJS : "");
            }
        ;

        //# If we haven't .run yet or we are in a .mode that we need to reprocess the SCRIPTs each time (because they fall out of scope)
        if (!oCache[sID].run || sMode === "l" || sMode === "t") {
            //# Collect the SCRIPT tags into a_sJS and flip .run to true
            a_sJS = oCache[sID].css.match(reScript) || [];
            oCache[sID].run = true;

            //# Traverse the extracted SCRIPT tags from the .css (if any)
            for (i = 0; i < a_sJS.length; i++) {
                $src = reScriptSrc.exec(a_sJS[i]);

                //# If there is an $src in the SCRIPT tag, .get the resulting js synchronously (as order of SCRIPTs matter)
                if ($src && $src[1]) {
                    $services.get($src[1], false, {
                        fn: fnCallback,
                        arg: i
                    });
                }
                //# Else this is an inline SCRIPT tag, so load the reDeScript'd code into the a_sJS eval stack
                else {
                    a_sJS[i] = a_sJS[i].replace(reDeScript, "");
                }
            }
        }

        return a_sJS || [];
    }; //# $services.processGetScripts


    //# Processes the CSS along with any a_sJS in the passed eval stack
    $services.processCSS = function($element, oOptions, a_sJS, bSetAttribute) {
        var i, a_sToken, sProcessedCSS,
            sID = $element.id,
            a_sTokenized = oCache[sID].css
                .replace(reScript, "")                                          //# Remove the SCRIPTs (so we don't have extra delimiters that get wrongly a_sTokenized)
                .replace(new RegExp("/\\*" + oOptions.d1, "g"), oOptions.d1)    //# Replace any commented delimiters with non-delimitered versions
                .replace(new RegExp(oOptions.d2 + "\\*/", "g"), oOptions.d2)    //# TODO: Move to setting .css?
                .split(oOptions.d1)                                             //# Now .split the processed .css
        ;

        //# Traverse the a_sTokenized .css
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

        //# Now that we have a fully populated a_sJS eval stack, process it while passing in the (globally defined) oInjections
        a_sJS = oCache[sID].evaler(a_sJS, oInjections);

        //# Set the first index of a_sTokenized into sProcessedCSS then traverse the rest of the a_sTokenized .css, rebuilding it as we go
        //#     NOTE: Since we are splitting on .d(elimiter)1, the first index of a_sTokenized represents the STYLE before the first /*{{var}}*/ so we don't process it and simply set it as the start of our sReturnVal
        sProcessedCSS = a_sTokenized[0];
        for (i = 1; i < a_sTokenized.length; i++) {
            //# Pull the result of the eval from a_sJS at the recorded .i(ndex) and append the trailing .css .s(tring)
            sProcessedCSS += a_sJS[a_sTokenized[i].i] + a_sTokenized[i].s;
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
    }; //# $services.processCSS


    //# Safely warns the user on the console
    $services.warn = function (s) {
        var c = console;
        (c ? (c.warn || c.log) : function () { })(cjsss + ": " + s);
    }; //# $services.warn



    //####################
    //# "Procedural" code
    //####################
    //# Before importing any external functionality, copy the original $service function references into .data.services
    $cjsss.data.services = $services.extend({}, $services);
    
    //# If the developer has already setup a $win[cjsss] object
    //#     NOTE: These first calls to .is.obj, .is.fn and .extend are the only non-overridable pieces of code in CjsSS!
    if ($services.is.obj($win[cjsss])) {
        //# If the developer has provided a servicesFactory, .extend it's results over our own $services
        if ($services.is.fn($win[cjsss].servicesFactory)) {
            $services.extend($services, $win[cjsss].servicesFactory($cjsss));
        }

        //# .extend any developer .options over our oDefaults
        $services.extend(oDefaults, $win[cjsss].options);
    }
    
    //# Build the passed fnEvalFactory (if one hasn't been set already)
    //#     NOTE: The fnEvalFactory is specifically placed outside of the "use strict" block to allow for the local eval calls below to persist across eval'uations
    $services.evalFactory = $services.evalFactory || fnEvalFactory($win, $doc, $services);

    //# Now .autorun
    $services.autorun();
})(
    window,
    document,
    (function(fnLocalEvaler) {
        //# SCRIPT tag versus eval - http://stackoverflow.com/questions/8380204/is-there-a-performance-gain-in-including-script-tags-as-opposed-to-using-eval
        //# and... http://jsperf.com/dynamic-script-tag-with-src-vs-xhr-eval-vs-xhr-inline-s/4
        return function ($win, $doc, $services) {
            var fnGEval;

            
            //# Returns a Javascript code string that safely collects the global version of eval into the passed sTarget
            //#     NOTE: A fnFallback is recommended as in some edge cases this function can return `undefined`
            //#     NOTE: Manually compressed SCRIPT expanded below (based on http://perfectionkills.com/global-eval-what-are-the-options/#the_problem_with_geval_windowexecscript_eval):
            //#         try {
            //#             return (function (globalObject, Object) {
            //#                 return ((1, eval)('Object') === globalObject
            //#                     ? function (c) { return (1, eval)(c); }
            //#                     : (window.execScript ? function (c) { return window.execScript(c); } : undefined)
            //#                 );
            //#             })(Object, {});
            //#         } catch (e) { return undefined; }
            function globalEvalFn() {
                return "try{return(function(g,Object){return((1,eval)('Object')===g?function(c){return(1,eval)(c);}:(window.execScript?function(c){return window.execScript(c);}:null));})(Object,{});}catch(e){return null}";
            }
            

            //# Evaluates the passed js within the passed context
            //function evalInContext(js, context) {
            //    //# Return the results of the in-line anonymous function we .call with the passed context
            //    return function () { return eval(js); }.call(context);
            //}


            //# Returns an object reference based on the passed eMode
            //#     TODO: this should be under a sandbox with the object injected
            function context(eMode, oContext) {
                //# If the passed eMode is a string
                if ($services.is.str(eMode)) {
                    //# Determine the first character of the passed eMode and process accordingly
                    switch (eMode.substr(0, 1).toLowerCase()) {
                        case "g": { //# global
                            return { context: $win, mode: "g" };
                        }
                        case "l": { //# local
                            return { context: null, mode: "l" };
                        }
                        case "t": { //# this & thislocal
                            //# If this is a thislocal request, we need to wireup .inContext under a new $sandbox
                            if (eMode === "thislocal") {
                                var $sandbox = createSandbox();
                                $sandbox.$sandbox.inContext = function (s) { $sandbox.$sandbox.local.call(oContext, s); };
                                return { context: $sandbox, mode: "l" };
                            }
                            //# 
                            //else {
                                return { context: oContext, mode: "t" };
                            //}
                        }
                        case "j": { //# json
                            return { context: JSON.parse, mode: "j" };
                        }
                        //case "s": //# sandbox
                        default: {
                            return { context: createSandbox(), mode: "s" };
                        }
                    }
                }
                //# Else we assume eMode is the oContext of a t(his) request
                else {
                    return { context: eMode, mode: "t" };
                }
            }
            

            //# Merges the passed oInject into the oContext (left-most wins)
            //#     NOTE: If a sKey already exists in the oContext, its value takes precedence over the one in oInject, hence "merge" rather than "extend"
            //#     NOTE: We assume that oContext is an object
            function merge(oContext, oInject) {
                //# If the passed oInject .is.obj
                if ($services.is.obj(oInject)) {
                    //# Traverse the oInject'ions (if any), importing any unique sKeys into the oContext
                    for (var sKey in oInject) {
                        if (oInject.hasOwnProperty(sKey)) {
                            oContext[sKey] = oContext[sKey] || oInject[sKey];
                        }
                    }
                }
            }


            //# Creates a sandbox via an iFrame that is temporally added to the DOM
            //#     NOTE: The `parent` is set to `null` to completely isolate the sandboxed DOM
            function createSandbox() {
                var oReturnVal,
                    $dom = ($doc.body || $doc.head || $doc.getElementsByTagName("head")[0]),
                    $iFrame = $doc.createElement("iframe")
                ;

                //# Configure the $iFrame, add it into the $dom and collect the $iFrame's DOM reference into our oReturnVal
                //#     NOTE: `contentWindow` rather than `frames[frames.length - 1]`, see: http://books.google.com.au/books?id=GEQlVcVf_zkC&pg=PA589&lpg=PA589&dq=contentWindow+ie5.5&source=bl&ots=iuq6xGPVtQ&sig=XKY-1_0pMNOo-BWYjHO7uRc47bE&hl=en&sa=X&ei=bZaGVILMGsro8AXxy4DQCQ&ved=0CCgQ6AEwAQ#v=onepage&q=contentWindow%20ie5.5&f=false , http://www.bennadel.com/blog/1592-getting-iframe-window-and-then-document-references-with-contentwindow.htm
                $iFrame.style.display = "none";
                $dom.appendChild($iFrame);
                oReturnVal = $iFrame.contentWindow;

                //# .write the SCRIPT out to the $iFrame (which implicitly runs the code) then remove the $iFrame from the $dom
                //#     NOTE: We very specifically do not "use strict" below to allow eval'd code to persist across calls.
                oReturnVal.document.write(
                    "<script>" +
                        "window.$sandbox={" +
                            "global: function(){" + globalEvalFn() + "}()," +
                            "local: function(s){return eval(s);}" +
                        "};" +
                        "parent=null;" +
                    "<\/script>"
                );
                oReturnVal.document.close();
                //$dom.removeChild($iFrame);

                //# Return the window reference to the caller
                return oReturnVal;
            } //# createSandbox

            
            //# Orchestrates the eval based on the passed vContext, allowing for Global (window), Sandboxed Global (sandbox), Local (null) and Context-based (non-null) versions of eval to be called as well as JSON.parse
            function factory(vContext, fnFallback) {
                //# If the passed vContext is a string, convert it into the appropriate object
                if ($services.is.str(vContext)) {
                    vContext = context(vContext).context;
                }

                //# Ensure the passed fnFallback is a function
                fnFallback = ($services.is.fn(fnFallback) ? fnFallback : function (s) {
                    $services.warn("Unable to collect requested `eval`, defaulting to the local `eval`.");
                    return (vContext && vContext.$sandbox && $services.is.fn(vContext.$sandbox.local)
                        ? vContext.$sandbox.local(s)
                        : eval(s)
                    );
                });

                //# Return the eval'ing function to the caller
                return function (js, oInject) {
                    var i,
                        a_sReturnVal = [],
                        bReturnArray = $services.is.arr(js),
                        oLocal = {
                            js: js,
                            returnVals: a_sReturnVal,
                            inject: oInject,
                            key: ""
                        }
                    ;
                    
                    //# If the passed js wasn't an array, we need to place it into one (resetting both js and oLocal.js to the new array)
                    //#     NOTE: Chained assignment is fun but can be dangerous, see: http://davidshariff.com/blog/chaining-variable-assignments-in-javascript-words-of-caution/
                    if (!bReturnArray) {
                        oLocal.js = js = [js];
                    }

                    //# If this is a JSON.parse call
                    //#     NOTE: This is placed at the top as the it is the default parser for in-line options (so it will likely be called the most)
                    if (vContext === JSON.parse) {
                        //# Ensure JSON.parse is setup (defaulting to the fnFallback if there are any issues)
                        JSON.parse = JSON.parse || fnFallback;

                        //# Traverse the js array, .parse'ing each entry as we go (placing the result into the corresponding index within our a_sReturnVal)
                        for (i = 0; i < js.length; i++) {
                            a_sReturnVal.push(JSON.parse(js[i]));
                        }
                    }
                    //# Else if this is a global context call
                    else if (vContext === $win) {
                        //# If the global version of eval hasn't been collected yet, get it now (defaulting to the fnFallback if there are any issues)
                        //#     NOTE: A function defined by a Function() constructor does not inherit any scope other than the global scope (which all functions inherit), even though we are not using this paticular feature (as globalEvalFn get's the global version on eval)
                        if (!fnGEval) {
                            fnGEval = new Function(globalEvalFn())() || fnFallback;
                        }

                        //# Merge the oInject into the vContext
                        merge(vContext, oInject);

                        //# Traverse the js array, eval'ing each entry as we go (placing the result into the corresponding index within our a_sReturnVal)
                        for (i = 0; i < js.length; i++) {
                            a_sReturnVal.push(fnGEval(js[i]));
                        }
                    }
                    //# Else if the caller passed in another kind of object
                    else if ($services.is.obj(vContext)) {
                        //# If this is a sandbox call
                        if (vContext.$sandbox) {
                            //# Reuse oLocal to grab a reference to .$sandbox's eval functionality (defaulting to .inContext first if its been setup and fnFall(ing)back if necessary)
                            //#     NOTE: .inContext is setup as as additional evaluation function outside of .createSandbox for "this" calls, so we need to use it first
                            oLocal = vContext.$sandbox.inContext || vContext.$sandbox.global || fnFallback;

                            //# Merge the oInject into the vContext
                            merge(vContext, oInject);

                            //# Traverse the js array, eval'ing each entry as we go (placing the result into the corresponding index within our a_sReturnVal)
                            for (i = 0; i < js.length; i++) {
                                a_sReturnVal.push(oLocal(js[i]));
                            }
                        }
                        //# Else .call fnLocalEvaler with the vContext
                        else {
                            fnLocalEvaler.call(vContext, oLocal);
                        }
                    }
                    //# Else assume this is a local context call (as no valid vContext was passed in), make a direct non-"use strict" call to eval via fnLocalEvaler
                    else {
                        fnLocalEvaler(oLocal);
                    }
                    
                    //# Return the resulting eval'uations/.parses to the caller in the same form they were passed in
                    return (bReturnArray ? a_sReturnVal : a_sReturnVal[0]);
                };
            } //# factory
            
            
            //# Polyfill JSON.parse from jQuery, a sandbox or ultimately our fnFallback if necessary
            if (!$win.JSON) {
                $win.JSON = { parse: ($win.jQuery ? $win.jQuery.parseJSON : createSandbox().$sandbox.local) };
            }
            
            //# Create the factory to return to the caller
            return {
                create: factory,
                sandbox: function (js, fnFallback) {
                    return factory(createSandbox(), fnFallback)(js);
                },
                json: JSON.parse,
                createSandbox: createSandbox,
                context: context
            };
        }; //# return
    })(function (/* oObj */) { //# This fnLocalEvaler function is placed here to limit its scope and local variables as narrowly as possible (hence the backflips with the arguments pseudo-array below)
        //# Traverse the passed .inject'ions (if any), importing each of its entries by .key into this[key] as we go
        //#     NOTE: This is basically a reimplementation of merge() that uses no local variables and exposes the .key's via `var` declarations
        //#     NOTE: This is standards compliant even though JSHit hates it ;) http://stackoverflow.com/questions/27682194/is-this-for-in-loop-standards-compliant#27682229
        //#     NOTE Could polyfill arr.forEach - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
        if (arguments[0].inject) {
            for (arguments[0].key in arguments[0].inject) {
                if (arguments[0].inject.hasOwnProperty(arguments[0].key)) {
                    eval("var " + arguments[0].key + " = arguments[0].inject[arguments[0].key];");
                }
            }
        }
        
        //# Traverse the passed .js, processing each entry in-turn (as ordering matters)
        //#     NOTE: The loop below is done in this way so as to expose no local vars (outside of the .imports) to the eval'd code
        //#     NOTE: Since this block is outside of the "use strict" block above, the eval'd code will remain in-scope across all evaluations (rather than isolated per-entry as is the case with "use strict"). This allows for local functions to be declared and used, but they automaticially fall out of scope once we leave this function.
        while (arguments[0].js.length > 0) {
            arguments[0].returnVals.push(eval(arguments[0].js.shift()));
        }
    })
);


/*
//# SCRIPT tag versus eval - http://stackoverflow.com/questions/8380204/is-there-a-performance-gain-in-including-script-tags-as-opposed-to-using-eval
//# 
//# http://www.nczonline.net/blog/2009/07/28/the-best-way-to-load-external-javascript/
//# http://stackoverflow.com/questions/8946715/lazy-loading-javascript-and-inline-javascript
//# http://www.html5rocks.com/en/tutorials/speed/script-loading/
//# https://github.com/jquery/jquery/blob/1.3.2/src/ajax.js#L264 but no longer in https://github.com/jquery/jquery/blob/1.x-master/src/ajax.js
function loadScript(sUrl, fnCallback) {
    var $script = document.createElement("script"),
        bLoaded = false
    ;

    //# Setup the $script tag
    $script.type = "text/javascript";
    $script.onload = $script.onreadystatechange = function () { 
        //# In order to support IE10- and Opera, test .readyState (which will be `undefined` in other environments), see: http://msdn.microsoft.com/en-au/library/ie/ms534359%28v=vs.85%29.aspx
        switch ($script.readyState || null) {
            case null:
            case "loaded":
            case "complete": {
                delete $script.onreadystatechange;
                if (!bLoaded) { fnCallback(); }
                bLoaded = true
            }
        }
    };
    $script.src = sUrl;

    //# 
    document.getElementsByTagName("head")[0].appendChild(script);
    //? document.documentElement.insertBefore(script, document.documentElement.firstChild);
}
*/
