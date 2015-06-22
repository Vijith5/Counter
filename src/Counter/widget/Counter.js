/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, document, jQuery */
/*mendix */
/*
    Counter
    ========================

    @file      : Counter.js
    @version   : 2.0
    @author    : Chad Evans
    @date      : 17 June 2015
    @copyright : Mendix Technology BV
    @license   : Apache License, Version 2.0, January 2004

    Documentation
    ========================
    Adds ability to show a datetime countdown or a timer in a Mendix app.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    'dojo/_base/declare', 'mxui/widget/_WidgetBase', 'dijit/_TemplatedMixin',
    'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-class', 'dojo/dom-style',
    'dojo/dom-attr', 'dojo/_base/array', 'dojo/_base/lang', 'dojo/text', 'dojo/json', 'dojo/html', 'dojo/_base/event',
    'Counter/lib/jquery-1.11.2', 'Counter/lib/jquery.TimeCircles-1.5.3', 'dojo/text!Counter/widget/template/Counter.html'
], function (declare, _WidgetBase, _TemplatedMixin,
    dom, dojoDom, domQuery, domClass, domStyle,
    domAttr, dojoArray, lang, text, json, html, event,
    _jQuery, _timecircles, widgetTemplate) {
    'use strict';

    var $ = _jQuery.noConflict(true);

    // Declare widget's prototype.
    return declare('Counter.widget.Counter', [_WidgetBase, _TemplatedMixin], {

        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // Parameters configured in the Modeler.
        targetDateTimeAttr: "",
        timerValueAttr: "",
        animationBehavior: "",
        oncompletemf: "",
        showDays: false,
        daysText: "",
        daysColor: "",
        showHours: true,
        hoursText: "",
        hoursColor: "",
        showMinutes: true,
        minutesText: "",
        minutesColor: "",
        showSeconds: true,
        secondsText: "",
        secondsColor: "",
        circleBackgroundColor: "",
        foregroundWidth: "",
        backgroundWidth: "",
        extraoptions: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _options: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            //console.log(this.id + '.postCreate');

            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            //console.log(this.id + '.update');

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering();

            callback();
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {},

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {},

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
            //console.log(this.id + '.resize');

            $(this.tcNode).TimeCircles().rebuild();
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.

            // clear out old values
            $(this.tcNode).removeData();

            $(this.tcNode).TimeCircles().destroy();
        },

        // Attach events to HTML dom elements
        _setupEvents: function () {
            var bg_width = mx.parser.parseValue(this.backgroundWidth.substring(1), "integer");
            var fg_width = mx.parser.parseValue("0." + this.foregroundWidth.substring(1), "float");
            
            this._options = {
                "animation": this.animationBehavior,
                "bg_width": bg_width / 100,
                "fg_width": fg_width,
                "circle_bg_color": this.circleBackgroundColor,
                "count_past_zero": false,
                "time": {
                    "Days": {
                        "text": this.daysText,
                        "color": this.daysColor,
                        "show": this.showDays
                    },
                    "Hours": {
                        "text": this.hoursText,
                        "color": this.hoursColor,
                        "show": this.showHours
                    },
                    "Minutes": {
                        "text": this.minutesText,
                        "color": this.minutesColor,
                        "show": this.showMinutes
                    },
                    "Seconds": {
                        "text": this.secondsText,
                        "color": this.secondsColor,
                        "show": this.showSeconds
                    }
                }
            };

            if (this.extraoptions !== '') {
                lang.mixin(this._options, json.parse(this.extraoptions));
            }
        },

        // Rerender the interface.
        _updateRendering: function () {
            if (this._contextObj !== null) {
                domStyle.set(this.tcNode, 'display', 'block');
                
                var valueString, jqueryTcNode;

                if (this.targetDateTimeAttr !== '') {
                    valueString = mx.parser.formatAttribute(this._contextObj, this.targetDateTimeAttr, {
                        datePattern: "yyyy-MM-dd HH:mm:ss"
                    });
                    domAttr.set(this.tcNode, 'data-date', valueString);
                } else {
                    if (this.timerValueAttr !== '') {
                        valueString = this._contextObj.get(this.timerValueAttr);
                        domAttr.set(this.tcNode, 'data-timer', valueString);
                    }
                }

                // clear out old values
                jqueryTcNode = $(this.tcNode);
                jqueryTcNode.removeData();

                jqueryTcNode.TimeCircles().destroy();

                jqueryTcNode.TimeCircles(this._options);

                if (this.oncompletemf !== '') {
                    jqueryTcNode.TimeCircles().addListener(lang.hitch(this, this._onComplete), 'visible');
                }
            } else {
                domStyle.set(this.tcNode, 'display', 'none');
            }
        },

        _onComplete: function (unit, value, total) {
            if (total === 0) {
                mx.data.action({
                    params: {
                        applyto: 'selection',
                        actionname: this.oncompletemf,
                        guids: [this._contextObj.getGuid()]
                    },
                    callback: function (obj) {
                        //TODO what to do when all is ok!
                    },
                    error: lang.hitch(this, function (error) {
                        console.log(this.id + ': An error occurred while executing microflow: ' + error.description);
                    })
                }, this);
            }
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            var _objectHandle = null,
                _attrHandle = null,
                _timerAttrHandle = null;

            // Release handles on previous object, if any.
            if (this._handles) {
                this._handles.forEach(function (handle, i) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions. 
            if (this._contextObj) {

                _objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                if (this.targetDateTimeAttr !== '') {
                    _attrHandle = this.subscribe({
                        guid: this._contextObj.getGuid(),
                        attr: this.targetDateTimeAttr,
                        callback: lang.hitch(this, function (guid, attr, attrValue) {
                            this._updateRendering();
                        })
                    });
                }

                if (this.timerValueAttr !== '') {
                    _timerAttrHandle = this.subscribe({
                        guid: this._contextObj.getGuid(),
                        attr: this.timerValueAttr,
                        callback: lang.hitch(this, function (guid, attr, attrValue) {
                            this._updateRendering();
                        })
                    });
                }

                this._handles = [_objectHandle, _attrHandle, _timerAttrHandle];
            }
        }
    });
});
require(['Counter/widget/Counter'], function () {
    'use strict';
});