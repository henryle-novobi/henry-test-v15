/* Copyright (c) 2016-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>) */
/* See LICENSE file for full copyright and licensing details. */
/* License URL : <https://store.webkul.com/license.html/> */

odoo.define('odoo_document_printer.inherit_form_renderer', function (require) {
    "use strict";

    var core = require('web.core');
    const rpc = require('web.rpc');
    var Dialog = require('web.Dialog');
    var FormRenderer = require('web.FormRenderer');
    var PrintButtonWidget = require('odoo_document_printer.print_button_widget');

    var _t = core._t;



    FormRenderer.include({

        start: function () {
            var self = this;
            return this._super.apply(this, arguments);
        },
        _render: async function () {
            var self = this;
            self.state.odoo_printer_data = false;
            await this._super(...arguments);
            await self.get_printer_data();
            if (self.state.odoo_printer_data.length) {
                var printWidget = new PrintButtonWidget(this, this.state);
                printWidget.prependTo(self.$el.find('.o_form_sheet'));
            }
        },

        get_printer_data: async function () {
            var self = this;
            var currentModel = self.state.model;
            var odoo_printer_data = await rpc.query({
                model: 'odoo.doc.printer',
                method: 'search_read',
                args: [[
                    ['model_name', '=', currentModel],
                    ['active', '=', true],
                ]],
            });
            if (odoo_printer_data.length)
                self.state.odoo_printer_data = odoo_printer_data;
        },

    });
})