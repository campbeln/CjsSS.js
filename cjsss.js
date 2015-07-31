/*
ngCss v0.9i (kk) http://opensourcetaekwondo.com/ngcss/
(c) 2014-2015 Nick Campbell ngcssdev@gmail.com
License: MIT
Add in a library such as Chroma (https://github.com/gka/chroma.js) to get color functionality present in LESS and Sass.
*/
(function (angular, _window, _document, fnCjs3, fnEvalerFactory, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory) {
    //# ngCss functionality
    var fnImplementation = function ($services) {
        'use strict';

        //# Setup the required "global" vars
        var $blankScope,
            ngCss = "ngCss",
            oModule = angular.module(ngCss, []),
            $ngCss = {
                version: "v0.9i",
                options: {
                    script: "isolated",
                    scope: "",
                    async: true,
                    live: false,
                    callback: null
                },
                data: {
                    cache: $services.cache,
                    //inject: {},
                    services: {}
                },
                services: $services

                //# There is no need to expose any functionality on the top level of the $ngCss as this is accomplished via our .factory and .filter
            },
            oDefaultOptions = $ngCss.options,                               //# Include these alias variables for improved code minimization
            //oInjections = $ngCss.data.inject,
            oCache = $services.cache
        ;


        //# Set our .version and .extend the passed $services with our own Angular (ng) logic then .conf(igure) the $services
        //#      NOTE: Setting up $services like this allows for any internal logic to be overridden as well as allows for all versions of CjsSS to coexist under a single definition (though some .conf logic would need to be used)
        $services.version[ngCss] = $ngCss.version;
        $services.extend($services, {
            ng: {
                //# Stub out the .factory and .directive interfaces (which are populated below)
                //factory: null,
                //directive: null,

                //# Use the .mixin as our .filter
                filter: $services.mixin,


                //# Configures the base $services object to work with the current implementation
                conf: function () {
                    var oConfig = $services.config; //# code-golf

                    //# Transforms the passed sCamelCase to dash-case (removing the erroneous leading dash if it's there)
                    function c2d(sCamelCase) {
                        var sDashCase = sCamelCase.replace(/([A-Z])/g, '-$1').toLowerCase();
                        return (sDashCase.indexOf("-") === 0 ? sDashCase.substr(1) : sDashCase);
                    } //# c2d


                    //# Set our $services.config options (so it can do error reporting and attribute processing correctly)
                    //#     NOTE: We cannot simply pass in $blankScope.$eval as calling .$eval indirectly seems to detach it from it's $blankScope!? (not that it matters in this case)
                    oConfig.attr = c2d(ngCss);
                    oConfig.scopeAlias = "script";
                    oConfig.expandAttr = "{ $scopeAlias: '$attr', scope: '$attr' }";

                    //# Rewire the $services.config.getEvaler functionality
                    oConfig.getEvaler = function (vScope) {
                        //# If the vScope maps to ngCss, return the evaler function, else return null
                        return (vScope === ngCss ?
                            function (sCode) {
                                //# Ensure the $blankScope exists, then return the .$eval'd sCode
                                $blankScope = $blankScope || $services.ng.factory.scope.$new({ isolate: true });
                                return $blankScope.$eval(sCode);
                            } :
                            null
                        );
                    };

                    //# Rewire the $services.scope.hook functionality
                    $services.scope.hook = function (oData) {
                        //# Reset the value of .go based on if .s(cope) is === false
                        //#     NOTE: This implements the boolean value of .script for ngCss that isn't present in the base implementation
                        oData.go = (oData.s !== false);
                        return oData;
                    };

                    //# Before importing any external functionality, copy the original $service function references into .data.services
                    //#     NOTE: angular.extend does not do a deep copy, while .merge does but is v1.4+ - http://stackoverflow.com/questions/17242927/deep-merge-objects-with-angularjs, https://docs.angularjs.org/api/ng/function/angular.extend , https://docs.angularjs.org/api/ng/function/angular.merge
                    $ngCss.data.services = $services.extend({}, $services);
                } //# conf
            }
        }); //# extend($services...
        $services.ng.conf();


        //# Transforms the passed object into an inline CSS string when bSelector is falsey (e.g. `color: red;`) or into CSS entry when bSelector is truthy (e.g. `selector { color: red; }`), where object._selector or vSelector is used for the selector
        oModule.filter('css', function () {
            return $services.ng.filter;
        }); //# oModule.filter('css'...


        //# ngCss factory to house public helper methods
        oModule.factory(ngCss, ["$rootScope", function ($rootScope) {
            //# Resolves the passed vElement into a jQuery/jqLite version (if any) 
            function resolveElement(vElement) {
                //# If vElement is a DOM ID, reset it to its DOM reference
                if ($services.is.str(vElement) && vElement.substr(0, 1) === "#") {
                    vElement = _document.getElementById(vElement.substr(1));
                }

                //# Collect the jQuery/jqLite version of vElement (if any)
                return angular.element(vElement);
            }
            

            //# Determines if the passed oObject is an Angular $scope
            function isScope(oObject) {
                return ($services.is.obj(oObject) && oObject.$root === $rootScope);
            }


            //# Creates a new Angular $scope, optionally oMerge'ing in the passed object
            function newScope(oOptions) {
                //# .extend the passed oOptions with the default values (while ensuring oOptions is an object) then return the .$new scope
                oOptions = $services.extend({
                    //merge: undefined,
                    isolate: false,
                    parent: $rootScope
                }, oOptions);
                return $services.extend($rootScope.$new(oOptions.isolate === true, oOptions.parent), oOptions.merge);
            }


            //# Shortcut method to properly collect the .isolateScope (or $scope) for the vElement
            function getScope(vElement, bForce) {
                var $scope, bIsIsolate,
                    $element = resolveElement(vElement)
                ;

                //# .warn on any errors we encounter collecting the $element (as without a jQuery/jqLite $element we can't get its $scope anyway)
                //#     NOTE: This allows the caller to pass anything within vElement without getting an error
                try {
                    //# If we were able to collect the $element
                    if ($element && $element[0]) {
                        //# If the $element is in the oCache, attempt to collect the .foreignScope from there
                        //#     NOTE: This is done as we may have a ngCss .foreignScope in effect for this $element that differs from both .isolateScope and .scope
                        if (oCache[$element[0].id]) {
                            $scope = oCache[$element[0].id].foreignScope;
                        }

                        //# If we didn't collect a valid $scope from the oCache
                        if (!isScope($scope)) {
                            //# Set $scope and bIsIsolate via Angular's functions (resetting $scope if no .isolateScope exists)
                            //#     NOTE: bIsIsolate utilizes all 3 boolean states; true == isolate, false == parent-scope and undefined == .foreignScope (as we are not certian if it's the $element's isolate or parent-scope)
                            //#     TODO: Allow return of bIsIsolate
                            $scope = $element.isolateScope();
                            bIsIsolate = isScope($scope);
                            if (!bIsIsolate) { $scope = $element.scope(); }
                        }
                    }
                } catch (e) {
                    $services.warn("Error collecting $scope for", vElement, e);
                }

                //# If we didn't locate a valid $scope but we are supposed to bForce a $scope, return a .$new one, else we're good to return whatever $scope we found (if any)
                return (!isScope($scope) && bForce === true ? $rootScope.$new(true) : $scope);
            } //# scope.get


            //# Populate the .$rootScope and the .factory structure under our $services, then return the .factory
            $services.ng.$rootScope = $rootScope;
            $services.ng.factory = {
                //# Expose our $ngCss object to allow for overloading of our internal functionality
                $ngCss: $ngCss,

                //# Extends our ngCss oDefaultOptions options with the passed oOptions while returning a copy of the oDefaultOptions
                defaults: function (oOptions) {
                    oDefaultOptions = $services.extend(oDefaultOptions, oOptions);
                    return $services.extend({}, oDefaultOptions);
                }, //# defaults


                //# Returns an unused sPrefix'ed HTML ID
                //#     NOTE: sPrefix must begin with /A-Za-z/ to be HTML-compliant
                newId: function (sPrefix) {
                    //# Use the .newId functionality within $services, passing in either the passed sPrefix or ngCss if none was passed
                    return $services.newId(sPrefix || ngCss);
                }, //# newId


                //# Bundle of Angular $scope functionality
                scope: {
                    //# Creates a new Angular $scope
                    $new: newScope,
                    
                    //# Shortcut method to properly collect the .isolateScope (or $scope) for the vElement
                    get: getScope,
                    
                    //# Determines if the passed oObject is an Angular $scope
                    is: isScope,
                    
                    //# Ensures that the passed oObject is a $scope, returning a new isolated $scope with the passed oObject .extend'ed in if it is not
                    as: function (oObject, bIsolate) {
                        return (isScope(oObject) ? oObject : newScope({
                            isolate: bIsolate === true,
                            //parent: $rootScope,
                            merge: oObject
                        }));
                    },
                    
                    //# Returns the 
                    outer: function (vElement) {
                        var $element = resolveElement(vElement),
                            $returnVal = getScope(
                                ($element && $services.is.fn($element.parent) ? $element.parent() : null)
                                /*, false*/
                            )
                        ;
                        return ($returnVal !== $rootScope ? $returnVal : undefined);
                    }
                }, //# scope

                //# Shortcut method to .$broadcast the custom event
                updateCss: function () {
                    $rootScope.$broadcast('updateCss');
                }, //# updateCss


                //# Shortcut method to listen for the custom .$broadcast event
                //#     NOTE: fnDoUpdateCSS !== .updateCSS as fnDoUpdateCSS must be parameterless
                addCssListener: function (fnDoUpdateCSS) {
                    $rootScope.$on('updateCss', fnDoUpdateCSS);
                } //# addCssListener
            };
            return $services.ng.factory;
        }]); //# oModule.factory(ngCss...


        //# Processes the referenced CSS (either inline CSS in STYLE tags or external CSS in LINK tags) for Angular {{variables}}, optionally allowing for live binding and inline script execution.
        //#
        //#     Options provided via the ng-css attribute (e.g. `<link ng-css="{ script: false, live: false, commented: true }" ... />`):
        //#         options.async (default: true)           Specifies if the LINK tags are to be fetched asynchronously or not
        //#         options.scope (default: false)          Specifies if the outer $scope is to be used by the directive. A 'false' value for this option results in an isolate scope for the directive and logically requires `options.script` to be enabled (else no variables will be settable).
        //#         options.script (default: false)         Specifies if <script> tags embedded within the CSS are to be executed. "local" specifies that the eval'uations will be done within an isolated closure with local scope, any other truthy value specifies that the eval'uations will be done within an isolated sandboxed enviroment with access only given to the $scope.
        //#         options.live (default: false)           Specifies if changes made within $scope are to be automatically reflected within the CSS.
        oModule.directive(ngCss, ['$interpolate', '$timeout', ngCss, function ($interpolate, $timeout, $ngCssFactory) {
            //# Implements the .link call
            function doLink(oCacheEntry, $scope, $evalScope) {
                //# Now that we have an $evalScope, reset the .ovaler
                //#     NOTE: We cannot simply pass in $evalScope.$eval as calling .$eval indirectly seems to detach it from its $evalScope!?
                oCacheEntry.ovaler = function (sCode) {
                    return $evalScope.$eval(sCode);
                };

                //# Get the oCompiledOptions, collecting them in the passed fnCallback (as the .compile.element within .compile.options may be .async)
                $services.compile.options(
                    oCacheEntry,
                    oDefaultOptions,
                    function (oCompiledOptions) {
                        //# Finalize the processing of the oCompiledOptions by running the .is.fn in .scope (if any)
                        //#     NOTE: There is no need to have a hook for .compile.options to do this post-processing as a hook would be called directly prior to this fnCallback, so we might as well do it at the head of the fnCallback
                        var sScope = ($services.is.fn(oCompiledOptions.scope) ? $services.fn.option(oCompiledOptions.scope, oCacheEntry) : oCompiledOptions.scope),
                            bFinailize = true
                        ;

                        //# If the caller passed is a string
                        if ($services.is.str(sScope)) {
                            //# If this is an #ID specification, .scope.get (NOT bForce'ing a new $scope if we can't find one on the referenced #ID so we get the .warn below)
                            if (sScope.substr(0, 1) === "#") {
                                bFinailize = false;

                                //# Wait for the other directives to be setup before running our logic
                                $timeout(function () {
                                    $scope = $ngCssFactory.scope.get(sScope /*, false*/);
                                    oCacheEntry.foreignScope = $scope;
                                    finalizeLink(oCacheEntry, $scope, oCompiledOptions);
                                });
                            }
                            //# Else if the caller didn't request the parent scope, create a .$new isolate $scope now
                            else if (sScope !== "parent") {
                                $scope = $ngCssFactory.scope.$new({ isolate: true });
                                oCacheEntry.foreignScope = $scope;
                            }
                            //# Else reset the oCacheEntry's .foreignScope
                            //#     TODO: Is this correct?
                            else {
                                oCacheEntry.foreignScope = null;
                            }
                        }
                        //# Else if we have a oParentCacheEntry
                        //#     NOTE: `evaler.parent` refers to the Javascript scope/heritage. The code below is no longer necessary as the user should address the parent Angular scope directly via #ParentID.
                        //else if (oParentCacheEntry) {
                        //    //# Collect the parent $scope (if any)
                        //    //#     NOTE: .scope.get will return any $scope in effect for the oParentCacheEntry, but since we have a falsey bForce, it will come back as undefined if there is no $scope (leaving our isolate $scope in-place)
                        //    oResults = $ngCssFactory.scope.get(oParentCacheEntry.dom /*, false*/);

                        //    //# If a parent $scope was found
                        //    if (oResults) {
                        //        //# Reset our $scope and oCache it under .foreignScope (for use in subsiquent .scope.get calls)
                        //        oCacheEntry.foreignScope = $scope = oResults;
                        //    }
                        //}

                        //# If we haven't bFinailize'd above, do so now
                        if (bFinailize) {
                            finalizeLink(oCacheEntry, $scope, oCompiledOptions);
                        }
                    }
                );
            } //# doLink


            //# Finalizes a .link call
            function finalizeLink(oCacheEntry, $scope, oCompiledOptions) {
                //# Local implementation of updateCSS with scope access to our oCacheEntry
                function updateCSS() {
                    //# .runScripts then .updateCSS
                    $services.runScripts(oCacheEntry, oCompiledOptions, { $scope: $scope, scope: $scope });
                    $services.updateCSS(oCacheEntry);
                }


                //# If the $scope got squashed, .warn the user
                if (!$ngCssFactory.scope.is($scope)) {
                    $services.warn("Error collecting $scope for", oCacheEntry.dom, oCompiledOptions.scope);
                }
                //# Else we have a valid $scope
                else {
                    //# Populate the oCacheEntry with the implementation-specific .ng
                    oCacheEntry.ng = {
                        //inject: { $scope: $scope, scope: $scope },
                        $i: $interpolate(oCacheEntry.css),
                        $s: $scope
                    };

                    //# Set the $interpolate function into our oCacheEntry
                    oCacheEntry.$interpolate = function () {
                        return oCacheEntry.ng.$i(oCacheEntry.ng.$s);
                    };
                    oCacheEntry.callback = oCompiledOptions.callback;
                    
                    //# .updateCSS
                    updateCSS();

                    //# If we are supposed to live-bind, .$watch for any changes in the $scope (calling our .updateCSS when they occur)
                    if (oCompiledOptions.live) {
                        $scope.$watch(updateCSS);
                    }
                    //# Else we are not .live, so setup the event listener
                    else {
                        $ngCssFactory.addCssListener(updateCSS);
                    }
                }
            } //# finalizeLink

            
            //# Reset the delimiters and .optionScope in our oDefaultOptions before sending them into .compile
            //#     NOTE: We hard-code the .optionScope below as attributes are always parsed by Angular in the Angular world (else we wouldn't have access to the $scope vars)
            //#     NOTE: This can be done once as this .directive exists at runtime only under a single angular instance
            oDefaultOptions.d1 = $interpolate.startSymbol();
            oDefaultOptions.d2 = $interpolate.endSymbol();
            oDefaultOptions.optionScope = ngCss;

            //# Populate the .$interpolate, .$timeout and the .directive structure under our $services, then return the .directive
            $services.ng.$interpolate = $interpolate;
            $services.ng.$timeout = $timeout;
            $services.ng.directive = {
                //# .restrict the directive to attribute only (e.g.: <style ng-css>...</style> or <link ng-css ... />)
                restrict: "A",

                //# TODO: move logic from template to here?
                //compile: function ($element, $attrs) {
                //    if ($attrs[ngCss].substr(0, 1) !== "{") {
                //        //$attrs[ngCss] = "";
                //        delete $attrs[ngCss];
                //        delete $attrs.$attr[ngCss];
                //    }
                //
                //    //# Return the .link function
                //    return function (/*$scope, $element, $attrs, ngControllers*/) {};
                //},

                //# Compiles the oCache entry for each ng-css $element while scooping out the CSS before Angular processes it (so we avoid issues with double processing of {{vars}})
                template: function ($element, $attrs) {
                    //# If this is a shorthand definition, clear the ngCss attribute from $attrs
                    //#     NOTE: This is necessary due to the ability to define `ng-css="#domId"` shorthand rather than `ng-css="{ scope: '#domId' }"` which throws a `lexerr` due to the ngCss attribute not being an object
                    //#     NOTE: Angular parses out the attributes prior to calling .template (duh!) but passes the internally used $attrs, so we are able to "erase" attribute values by deleting them within $attrs
                    //#     TODO: May want to delete the ngCss entries from $attrs to fully remove all Angular hooks? May need to do in compile?
                    if ($attrs[ngCss].substr(0, 1) !== "{") {
                        //$attrs[ngCss] = "";
                        delete $attrs[ngCss];
                        delete $attrs.$attr[ngCss];
                    }

                    //# .compile the DOM version of the $element, post-processing any non-LINK/STYLE tags (as this is the initial .compile)
                    $services.compile.element($element[0], oDefaultOptions,
                        //# fnCallback: implementation-specific .compile postprocessing logic
                        function (oCacheEntry /*, a__Elements*/) {
                            //# If this $element isn't a LINK/STYLE tag
                            if (oCacheEntry.tag === "*") {
                                //# Cache the ngCss attribute then remove it (to avoid $isolateScope issues with any other ng-* attributes)
                                //#     NOTE: Removing the attribute is a sneaky trick as we are removing our own $isolateScope directive before Angular has fully $compile'd it
                                oCacheEntry[ngCss] = $element.attr(oCacheEntry.options.attr);
                                $element.removeAttr(oCacheEntry.options.attr);
                            }
                        },
                        true
                    );
                }, //# template


                //# Define the link function to wire-up our functionality at data-link
                link: function ($scope, $element /*, $attrs, $controllers*/) {
                    var sID = $element[0].id,                                       //# We know the $element has an .id as it was .compiled in .template above
                        oCacheEntry = oCache[sID],
                        $evalScope = $ngCssFactory.scope.outer($element) || $scope  //# Default $evalScope to our .scope.outer (if any, as we may or may not be using our isolate $scope)
                    ;
                    
                    //# If we successfully collected the oCacheEntry, call doLink now
                    if (oCacheEntry) {
                        doLink(oCacheEntry, $scope, $evalScope);
                    }
                    //# Else oCacheEntry doesn't exist yet (which means it's a LINK tag that's still being processed), so wire in doLink as a .c(all)o(n)c(omplete)
                    else {
                        $services.coc[sID] = function () {
                            $services.coc[sID] = null;
                            doLink(oCache[sID], $scope, $evalScope);
                        };
                    }
                } //# link
            };
            return $services.ng.directive;
        }]); //# oModule.directive(ngCss...
    }; //# fnImplementation


    //####################################################################################################
    //# Call fnCjs3 to orchestrate our fnImplementation
    //#     NOTE: We double handle fnEvalerFactory, fnLocalEvaler, fnUseStrictEvaler and fnSandboxEvalerFactory to allow them to have limited scopes
    //####################################################################################################
    fnCjs3(_window, _document, fnImplementation, fnEvalerFactory, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory);
})(
    //# Include any external libraries
    angular,

    //# Pass in the standard objects (code-golf)
    window,
    document,

    //# fnCjs3 function used to DI/ease maintenance across ngCss, CjsSS.js, $.CjsSS and EvalerJS
    function (_window, _document, fnImplementation, fnEvalerFactory, fnLocalEvaler, fnUseStrictEvaler, fnSandboxEvalerFactory) {
        'use strict';

        //# Setup the required $baseServices
        var fnPrevaler,
            $this = this,
            oCache = {},
            oCallOnComplete = {},
            _Object_prototype_toString = Object.prototype.toString, //# code-golf
            //reScriptTag = /<[\/]?script.*?>/gi,
            reScript = /<script.*?>([\s\S]*?)<\/script>/gi,
            $baseServices = {
                version: {
                    //evaler: '',
                    baseServices: 'v0.9i'
                },
                config: {
                    //getEvaler: null,	//# function (sScope) { return function(vJS) { return eval(sJS); }; },
                    attr: '',
                    scopeAlias: 'scope',
                    expandAttr: '{ "$scopeAlias": "$attr" }'
                },
                cache: oCache,
                coc: oCallOnComplete,


                //# Element compiler functionality
                compile: {
                    //# Sets the oCache entry for the passed _element
                    setCache: function (_element, oPrelimOptions, sCSS, sTag, _link) {
                        var bIsStyleAttribute = (sTag === "*"),
                            _originalElement = _link || _element,
                            reD1 = new RegExp("/\\*" + escapeRegex(oPrelimOptions.d1), "g"),
                            reD2 = new RegExp(escapeRegex(oPrelimOptions.d2) + "\\*/", "g"),

                            //# Setup the oCacheEntry for this _element
                            //#     NOTE: .scripts are not allowed in style attributes, nor are inline-defined options hence the bIsStyleAttribute ternary logic
                            oCacheEntry = {
                                link: _link || null,
                                dom: _element,
                                tag: sTag,
                                options: $baseServices.compile.getOptions(_originalElement, bIsStyleAttribute ? "" : sCSS),
                                scripts: (bIsStyleAttribute ? null : $baseServices.compile.getScripts(_originalElement, sCSS)),
                                //data: optionallySetBelow,
                                //evaler: setBelow,

                                //# Wrap the .ovaler to catch and .warn on any e(rrors)
                                ovaler: $baseServices.fn.code(
                                    $baseServices.compile.getEvaler(
                                        oCacheEntry,
                                        $baseServices.scope.resolve(oCacheEntry, oPrelimOptions, "optionScope" /*, false*/),
                                        "o"
                                        //, false
                                    ),
                                    _element
                                ),

                                //# Implicitly removes and leading/training CSS comments from the .d(elimiter)1/.d(elimiter)2
                                //#     NOTE: In Angular, the .d(elimiter)1/.d(elimiter)2 are hard-set from $interpolate.startSymbol/.endSymbol
                                css: (sCSS || "").replace(reScript, "").replace(reD1, oPrelimOptions.d1).replace(reD2, oPrelimOptions.d2)
                            }
                        ;

                        //# Now set the oCacheEntry into the global oCache (by .id)
                        oCache[_originalElement.id] = oCacheEntry;
                    }, //# setCache


                    //# Sets up the oCache entry for the passed _element
                    element: function (_element, oPrelimOptions, fnCallback, bSurpressErrors) {
                        var sID,
                            bIsLink = false,
                            a__Elements = [_element]
                        ;

                        //# Collect the sID (while ensuring the _element has an .id)
                        sID = _element.id = _element.id || $baseServices.newId();

                        //# If we already have a oCache entry, send it into getEvaler to optionally reset our .evaler
                        if (oCache[sID]) {
                            $baseServices.compile.setEvaler(oCache[sID], oPrelimOptions, fnCallback, a__Elements /*, false*/);
                        }
                        //# Else we need to build the oCache entry for this _element
                        else {
                            //# Determine the .tagName and process accordingly
                            switch (_element.tagName.toLowerCase()) {
                                case "style": {
                                    //# .setCache for this STYLE tag then remove the CSS from the _element
                                    //#     NOTE: We remove the CSS so we avoid issues with partial styles and (in Angular) double processing of {{vars}}
                                    $baseServices.compile.setCache(_element, oPrelimOptions, _element.innerHTML, "s" /*, undefined*/);
                                    _element.innerHTML = "";
                                    break;
                                }
                                case "link": {
                                    bIsLink = true;

                                    //# .get the file contents from the CSS file
                                    $baseServices.get(_element.href,
                                        //# .getOptions for our _element (collecting only the .a(ttribute)), .compile.prevaler it then safely .resolve its .async setting (if any) or fallback to oPrelimOptions's .async
                                        $baseServices.resolve(
                                            $baseServices.compile.prevaler($baseServices.compile.getOptions(_element /*, ""*/).a, oPrelimOptions),
                                            "async"
                                        ) || oPrelimOptions.async,

                                        //# fnCallback
                                        function (bSuccess, sCSS /*, $xhr*/) {
                                            //# If the .get was a bSuccess
                                            if (bSuccess) {
                                                var _style = _document.createElement('style');
                                                _style.appendChild(_document.createTextNode('')); //# WebKit hack

                                                //# Setup the oCache entry for the new _style _element
                                                //#     NOTE: .setCache needs to be called prior to replacing the LINK _element with the new _style
                                                $baseServices.compile.setCache(_style, oPrelimOptions, sCSS, "l", _element);

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
                                                $baseServices.compile.setEvaler(oCache[sID], oPrelimOptions, fnCallback, a__Elements, bSurpressErrors);
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
                                    $baseServices.compile.setCache(_element, oPrelimOptions, _element.getAttribute("style"), "*" /*, undefined*/);
                                    _element.removeAttribute("style");
                                }
                            } //# switch

                            //# So long as this is not a bIsLink (which calls .getEvaler above), send the oCache entry into .getEvaler
                            if (!bIsLink) {
                                $baseServices.compile.setEvaler(oCache[sID], oPrelimOptions, fnCallback, a__Elements, bSurpressErrors);
                            }
                        }

                        //# Return the .compiled a__Elements to the caller
                        return a__Elements;
                    }, //# element


                    //# Resolves the passed oScope object into an evaler function
                    getEvaler: function (oCacheEntry, oScope, eMode, bSurpressErrors) {
                        var fnReturnVal,
                            sScope = oScope.s
                        ;

                        //# If the sScope defines a valid interface under the .evalFactory, use it to collect the fnCustomEvaler
                        if ($baseServices.is.fn($baseServices.evalFactory[sScope])) {
                            //# If this is a .sandbox request, create a new $iframe
                            if (sScope === "sandbox") {
                                //oScope.c = $baseServices.evaler.iframeFactory("allow-scripts", "" /*, undefined*/);
                                // neek
                                fnReturnVal = $baseServices.evalFactory[sScope]($baseServices.evaler.iframeFactory("allow-scripts", "" /*, undefined*/)).global();
                            }
                                //# neek
                            else {
                                fnReturnVal = $baseServices.evalFactory[sScope](oScope.c);
                            }
                        }
                            //# Else if we have a valid .$getEvaler, use it to collect the fnCustomEvaler
                        else if ($baseServices.is.fn($baseServices.config.getEvaler)) {
                            fnReturnVal = $baseServices.config.getEvaler(sScope);
                        }

                        //# If the sScope is not a valid interface and this is a not a bSurpressErrors call, .warn the user
                        //#     NOTE: We filter based on initial/bSurpressErrors because on the initial call we can be running before the sScope has been setup, so we allow it to pass
                        if (!$baseServices.is.fn(fnReturnVal) && bSurpressErrors === true) {
                            $baseServices.warn("Invalid " + eMode + "valer `" + sScope + "` for", oCacheEntry.dom);
                        }

                        return fnReturnVal;
                    }, //# getEvaler


                    //# Processes the .scope to (re)set the .evaler
                    setEvaler: function (oCacheEntry, oPrelimOptions, fnCallback, a__Elements, bSurpressErrors) {
                        var vParent, fnCustomEvaler,
                            _element = oCacheEntry.dom,
                            sID = _element.id,
                            oScope = $baseServices.scope.resolve(oCacheEntry, oPrelimOptions, $baseServices.config.scopeAlias /*, false*/),
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
                                //# If this is not a bSurpressErrors call, .warn the user
                                //#      NOTE: We filter based on initial/bSurpressErrors because on Angualr's .template call we can be running before the sScope has been setup, so we allow it to pass
                                if (bSurpressErrors === true) {
                                    $baseServices.warn("Invalid scope `" + sScope + "` for", _element, sScope);
                                }
                            }
                            //# Else if the .evaler hasn't been set yet, if the sScope has changed or if the .c(ontext) has changed
                            else if (!oCacheEntry.evaler || oCacheEntry.evaler.scope !== sScope || oCacheEntry.evaler.context !== oScope.c) {
                                //# If this is an non-related sScope
                                if (sScope.substr(0, 1) !== "#") {
                                    //# Call resolveEvalerFn to collect the fnCustomEvaler
                                    fnCustomEvaler = $baseServices.compile.getEvaler(oCacheEntry, oScope, "e", bSurpressErrors);

                                    //# If we were able to collect a fnCustomEvaler, .setCacheEvaler
                                    if ($baseServices.is.fn(fnCustomEvaler)) {
                                        setCacheEvaler(null, sScope, sScope, fnCustomEvaler);
                                    }
                                }
                                    //# Else the sScope is denoting a DOM ID
                                else {
                                    //# Try to pull our vParent from the oCache
                                    vParent = oCache[sScope.substr(1)];

                                    //# If we found our vParent, .setCacheEvaler
                                    if (vParent) {
                                        if ($baseServices.is.fn($baseServices.resolve(vParent, "evaler.$eval"))) {
                                            setCacheEvaler(vParent, sScope, vParent.evaler.scope, vParent.evaler.$eval);
                                        } else {
                                            $baseServices.warn("Invalid evaler `" + sScope + "` for", _element);
                                        }
                                    }
                                        //# Else we need to bRecursed to .compile our vParent
                                    else {
                                        //# If we can find our vParent in the _document, flip bRecursed then, you know... recurse
                                        vParent = _document.getElementById(sScope.substr(1));
                                        if (vParent) {
                                            bRecursed = true;

                                            //# Recurse to .compile our vParent, passing in our own fnCallback
                                            $baseServices.compile.element(vParent, oPrelimOptions,
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
                                                //, false
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
                    }, //# setEvaler


                    //# Compiles the oOptions in effect for the passed oCacheEntry (if any) in the proper priority
                    options: function (oCacheEntry, oPrelimOptions, fnCallback) {
                        //# 
                        function processCacheOptions(oCacheOptions) {
                            if (oCacheOptions) {
                                if (oCacheOptions.a && !oCacheOptions.$a) { oCacheOptions.$a = oCacheEntry.ovaler(oCacheOptions.a); }
                                if (oCacheOptions.c && !oCacheOptions.$c) { oCacheOptions.$c = oCacheEntry.ovaler(oCacheOptions.c); }
                            }
                        } //# processCacheOptions

                        //# re-.compile the DOM version of the $element so we can (re-)resolve our .evaler and .scope
                        $baseServices.compile.element(oCacheEntry.dom, oPrelimOptions,
                            //# fnCallback: implementation-specific .compile postprocessing logic
                            function (oRecompiledCacheEntry /*, a__Elements*/) {
                                var oParentOptions;

                                //# If this $element isn't a LINK/STYLE tag, we can re-add the ng-css attribute now that we're post $compile
                                //#     NOTE: We really don't need to do this, but it is what the user expects to be in place so it's good practice
                                //#     NOTE: This is the Yang to .compileCallback's Yin
                                if (oRecompiledCacheEntry.tag === "*") {
                                    oCacheEntry.dom.setAttribute(oRecompiledCacheEntry.options.attr, oRecompiledCacheEntry[$baseServices.config.attr]);
                                }

                                //# .resolve our oParentOptions (if any) then .processCacheOptions for both the oParentOptions and the oRecompiledCacheEntry
                                oParentOptions = $baseServices.resolve(oRecompiledCacheEntry, "evaler.parent.options") || {};
                                processCacheOptions(oParentOptions);
                                processCacheOptions(oRecompiledCacheEntry.options);

                                //# Set our oReturnVal to the options in the proper priority order
                                fnCallback($baseServices.extend({}, oPrelimOptions, oParentOptions.$c, oParentOptions.$a, oRecompiledCacheEntry.options.$c, oRecompiledCacheEntry.options.$a));
                            }
                            //, false
                        );
                    }, //# options


                    //# Evaluates the options within the passed sCSS as well as the _element's .attr
                    getOptions: function (_element, sCSS) {
                        //# Ensure that .hasAttribute exists (IE8+ only, hence the polyfill)
                        _element.hasAttribute = _element.hasAttribute || $baseServices.hasAttribute;

                        var a_sMatch,
                            sBaseAttrName = $baseServices.config.attr, //# code-golf
                            reCSSOptions = new RegExp("^\\s*\\/\\*" + escapeRegex($baseServices.config.attr) + "\\((\\{.*?\\})\\)\\*\\/", "i"), //# Match the first non-whitespace characters on /*cjsss({ .*? })*/
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
                    }, //# getOptions


                    //# Option Evaler based on the oPrelimOptions
                    prevaler: function (sCode, oPrelimOptions) {
                        //# If the fnPrevaler hasn't been setup yet, define it now (wrapping it as we go via .fn.code)
                        if (!fnPrevaler) {
                            fnPrevaler = $baseServices.fn.code(
                                $baseServices.compile.getEvaler(
                                    { dom: $this },
                                    $baseServices.scope.resolve({ dom: $this }, oPrelimOptions, "optionScope", true),
                                    "o"
                                    //, false
                                ),
                                $baseServices.compile.prevaler
                            );
                        }

                        //# Return the results of the wrapped fnPrevaler
                        return fnPrevaler(sCode);
                    }, //# prevaler


                    //# Collects the SCRIPT blocks within the passed sCSS, returning the eval stack
                    getScripts: function (_element, sCSS) {
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
                    } //# getScripts
                }, //# compile


                //# Evaluate in scope
                //#     NOTE: Allows for Injection logic
                //$eval: function(vElement, vJS) {
                //    var sID = ($baseServices.is.dom(vElement) ? vElement.id : vElement,
                //        oCacheEntry = oCache[sID]
                //    ;
                //    
                //    //# 
                //    if (oCacheEntry) {
                //        // oInject = { $scope: $scope, scope: $scope }
                //        return oCacheEntry.evaler.$eval(vJS, oCacheEntry.inject, true);
                //    }
                //}, //# $eval


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


                //# Function-related functionality
                fn: {
                    //# Safely calls the passed fn (if it .is.fn) while .apply'ing the provided vArguments and vThis
                    safe: function (fn, vArguments, vThis) {
                        if ($baseServices.is.fn(fn)) {
                            return fn.apply(
                                vThis || $this,
                                $baseServices.is.arr(vArguments) ? vArguments : [vArguments]
                            );
                        }
                    }, //# safe


                    //# Calls option functions with the standard arguments
                    option: function (fn, oCacheEntry) {
                        return $baseServices.fn.safe(fn, [oCacheEntry.dom, oCacheEntry] /*, $this*/);
                    },


                    //# Returns the passed fnEvaler try/catch/.warn wrapped
                    //#     NOTE: We do this to limit the requirements on the fnEvaler as well as to standardize the error messages (as well as to clearly define the required interface of the fnOvaler)
                    //#     TODO: Not certian this is catching the errors as intended
                    code: function (fnEvaler, vTarget) {
                        return function (sCode) {
                            try {
                                return fnEvaler(sCode);
                            } catch (e) {
                                $baseServices.warn("Error evaluating `" + sCode + "` for", vTarget, e);
                                return {};
                            }
                        };
                    }
                }, //# fn


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
                }, //# get


                //# .hasAttribute Polyfill for IE8-
                hasAttribute: function (s) {
                    return typeof this[s] !== 'undefined';
                }, //# hasAttribute


                //# Datatype checking functionality
                is: {
                    arr: function (a) {
                        return (_Object_prototype_toString.call(a) === '[object Array]');
                    },
                    dom: function (x) {
                        return (x && $baseServices.is.str(x.tagName) && $baseServices.is.fn(x.getAttribute));
                    },
                    fn: function (f) {
                        return (_Object_prototype_toString.call(f) === '[object Function]');
                    },
                    jq: function (x) {
                        return (x && $baseServices.is.fn(x.replaceWith) && $baseServices.is.dom(x[0]));
                    },
                    obj: function (o) {
                        return (o && o === Object(o) && !$baseServices.is.fn(o));
                    },
                    str: function (s) {
                        //# NOTE: This function also treats a 0-length string (null-string) as a non-string
                        return ((typeof s === 'string' || s instanceof String) && s !== ''); //# was: (typeof s === 'string' || s instanceof String);
                    }
                }, //# is


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
                    //else if ($baseServices.is.str(oObj)) {
                    //    //# TODO
                    //}

                    return sReturnVal;
                }, //# mixin


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
                }, //# newId


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
                }, //# resolve


                //# 
                //#     TODO: Can I remove oInject from this call?
                runScripts: function (oCacheEntry, oCompiledOptions, oInject) {
                    var oResults,
                        a_sScripts = oCacheEntry.scripts || [],
                        oParentCacheEntry = $baseServices.resolve(oCacheEntry, "evaler.parent")
                    ;

                    //# If the caller opted to enable SCRIPT tags within the CSS and there are some to .run
                    //#     TODO: Setup an error message for a non-.is.fn .evaler.$eval?
                    //#     TODO: Move this if block out into fnCjs3?
                    if (oCompiledOptions.script !== false && oCacheEntry.evaler.run !== 0) {
                        //# If we have .scripts in our oParentCacheEntry to .run
                        if (oParentCacheEntry && $baseServices.is.arr(oParentCacheEntry.scripts) && oParentCacheEntry.evaler.run !== 0) {
                            //# Prepend oParentCacheEntry's .script entries into a_sScripts and decrement its .run
                            a_sScripts = oParentCacheEntry.scripts.concat(a_sScripts);
                            oParentCacheEntry.evaler.run--;
                        }

                        //# .evaler.$eval the a_sScripts (signaling we want an object as the return so we can report any .errors) then decrement our .run
                        //#     TODO: Verify there are a_sScripts to .run?
                        oResults = oCacheEntry.evaler.$eval(a_sScripts, oInject, true);
                        oCacheEntry.evaler.run--;

                        //# If we had .errors .eval'ing the a_sScripts, .warn the caller
                        if (oResults.errors.length > 0) {
                            $baseServices.warn("Error evaluating Javascript for", oCacheEntry.dom, oResults.errors);
                        }
                    }

                    return oResults;
                },


                //# Javascript Scope and Context resolution service used within .compile
                scope: {
                    //# Recursively resolves the .s(cope) and .c(ontext) for the passed oCacheEntry
                    resolve: function (oCacheEntry, oPrelimOptions, sTarget, bFromPrevaler) {
                        var sAttrOptions = $baseServices.resolve(oCacheEntry, "options.a"),
                            oReturnVal = $baseServices.scope.$(	//# Build the object (collecting the .s(cope)) and pass it into the rescurive $ function
                                {
                                    //c: undefined,
                                    s: (bFromPrevaler !== true ?
                                        $baseServices.resolve($baseServices.compile.prevaler(sAttrOptions, oPrelimOptions), sTarget) || oPrelimOptions[sTarget] :
                                        oPrelimOptions[sTarget]
                                    ),
                                    go: true
                                },
                                oCacheEntry,
                                $baseServices.config.scopeAlias
                            )
                        ;

                        //# If a .c(ontext) has been passed and we are not a local or usestrict .s(cope), .warn the user
                        if (oReturnVal.c) {
                            switch ((oReturnVal.s || "").toLowerCase()) {
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
                    $: function (oData, oCacheEntry, sScopeAlias) {
                        //# If the .s(cope) .is.fn, call it with the oCacheEntry while resetting .s(cope) to its result
                        if ($baseServices.is.fn(oData.s)) {
                            oData.s = $baseServices.fn.option(oData.s, oCacheEntry);
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
                            else if (sScopeAlias in oData.s && 'context' in oData.s) {
                                oData.c = oData.s.context;
                                oData.s = oData.s[sScopeAlias];
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
                            oData = $baseServices.scope.$(oData, oCacheEntry, sScopeAlias);
                        }

                        return oData;
                    }
                }, //# scope


                //# Updates the _element's CSS
                updateCSS: function (oCacheEntry) {
                    try {
                        var sProcessedCSS = oCacheEntry.$interpolate();

                        //# If this is a non-LINK/STYLE entry set the sProcessedCSS into the style attribute
                        if (oCacheEntry.tag === "*") {
                            //$element.attr("style", sProcessedCSS);
                            //oCacheEntry.dom.setAttribute("style", sProcessedCSS); //# <=IE7 no likie, besides .style.cssText is more correct
                            oCacheEntry.dom.style.cssText = sProcessedCSS;
                        }
                            //# Else this is a LINK/STYLE entry, so set the sProcessedCSS into the .html
                        else {
                            //# If this is IE8 or below we'll have a .styleSheet (and .styleSheet.cssText) to set .css into, else we can use .innerHTML, see: http://stackoverflow.com/questions/9250386/trying-to-add-style-tag-using-javascript-innerhtml-in-ie8 , http://www.quirksmode.org/dom/html/#t00 , http://stackoverflow.com/questions/5618742/ie-8-and-7-bug-when-dynamically-adding-a-stylesheet , http://jonathonhill.net/2011-10-12/ie-innerhtml-style-bug/
                            //#     TODO: Test in IE8-
                            //if (oCacheEntry.dom.styleSheet) {
                            //    oCacheEntry.dom.styleSheet.cssText = sProcessedCSS;
                            //} else {
                            //    oCacheEntry.dom.innerHTML = sProcessedCSS;
                            //}
                            oCacheEntry.dom.innerHTML = sProcessedCSS;
                        }

                        //# Call our options .callback (if any), resetting the .callback to null if it returns false
                        if ($baseServices.fn.option(oCacheEntry.callback, oCacheEntry) === false) {
                            oCacheEntry.callback = null;
                        }
                    } catch (e) {
                        $baseServices.warn(
                            "Error updating CSS for",
                            oCacheEntry.dom,
                            e
                        );
                    }
                }, //# updateCSS


                //# Safely warns the user on the console
                warn: function (sMessage, _element, vError) {
                    var c = console || function () { }; //# code-golf
                    (c.warn || c.log || c)($baseServices.config.attr + ": " + sMessage, _element, vError);
                } //# warn
            } //# $baseServices
        ;

        //# Escapes RegExp special characters for use in a RegExp expression as literals
        function escapeRegex(s) {
            return s.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
        } //# escapeRegex


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
