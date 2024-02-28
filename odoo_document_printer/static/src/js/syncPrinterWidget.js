/* Copyright (c) 2016-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>) */
/* See LICENSE file for full copyright and licensing details. */
/* License URL : <https://store.webkul.com/license.html/> */


odoo.define('odoo_document_printer.sync_printer_widget', function (require) {
    "use strict";

    var core = require('web.core');
    var session = require('web.session');
    var time = require('web.time');
    var utils = require('web.utils');
    var Widget = require('web.Widget');
    var SystrayMenu = require('web.SystrayMenu');
    const rpc = require('web.rpc');
    var PrintButtonWidget = require('odoo_document_printer.print_button_widget');
    var printWidget = new PrintButtonWidget(self);
    var _t = core._t;

    const { Component } = owl;

    /**
     * Menu item appended in the systray part of the navbar, redirects to the next
     * activities of all app
     */
    var SyncPrinterWidget = Widget.extend({
        name: 'sync_printer_widget',
        template: 'SyncNetworkPrinterWidget',
        events: {
            'click': '_updateConnection'
        },

        start: function () {
            return this._super();
        },
        willStart: async function () {
            var superDef = this._super.apply(this, arguments);
            var self = this;
            self.printer_name = await self.get_printer_name();
            if (self.printer_name)
                printWidget.auto_sync_printer(self.printer_name);
            return superDef;
        },
        get_printer_name: async function () {
            var config_data = await rpc.query({
                model: 'odoo.doc.printer',
                method: 'get_config_data',
                args: []
            })
            return config_data;
        },
        _updateConnection: function () {
            var self = this;
            if (self.printer_name)
                printWidget.auto_sync_printer(self.printer_name);
        },
    });
    SystrayMenu.Items.push(SyncPrinterWidget);
});