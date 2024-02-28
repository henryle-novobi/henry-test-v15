/* Copyright (c) 2016-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>) */
/* See LICENSE file for full copyright and licensing details. */
/* License URL : <https://store.webkul.com/license.html/> */

odoo.define('odoo_document_printer.print_button_widget', function (require) {
    "use strict";

    var core = require('web.core');
    var session = require('web.session');
    var time = require('web.time');
    var utils = require('web.utils');
    var Widget = require('web.Widget');
    var rpc = require('web.rpc');
    var _t = core._t;
    var QWeb = core.qweb;


    var PrintButtonWidget = Widget.extend({
        template: 'printButtonWidget',
        events: {
            'click': '_printDoc'
        },
        init: function () {
            this._super.apply(this, arguments);
            var self = this;
            this.formData = arguments[1];
            if (self.formData && self.formData.odoo_printer_data)
                self.doc_print_data = self.formData.odoo_printer_data[0];
        },
        willStart: function () {
            var superDef = this._super.apply(this, arguments);
            return superDef;
        },
        start: function () {
            var element = this.$el;
            var self = this;
            return this._super.apply(this, arguments);
        },

        connect_to_printer: function () {
            var self = this
            var printer_name = false;
            self.set_status('connecting')
            return qz.websocket.connect().then(function () {
                if (self.doc_print_data)
                    var printer_name = self.doc_print_data.printer_name;
                if (!printer_name) {
                    printer_name = self.printer_name;
                }
                self.remote_status = 'connected';
                self.set_status(self.remote_status)
                return qz.printers.find(printer_name).then(function (found) {
                    self.config = qz.configs.create(printer_name);
                    self.remote_status = 'success';
                    self.set_status(self.remote_status)
                }).catch(function (e) {
                    self.remote_status = 'c_error';
                    self.set_status(self.remote_status)
                });
            }).catch(function (e) {
                console.error(e);
                self.remote_status = 'c_error';
                self.set_status(self.remote_status)
            });
        },
        set_status(status) {
            var status_list = ['connected', 'connecting', 'c_error', 'success']
            for (var i = 0; i < status_list.length; i++) {
                $('.nw_printer .js_' + status_list[i]).addClass('oe_hidden');
            }
            $('.nw_printer .js_' + status).removeClass('oe_hidden');
        },
        disconnect_from_printer: function () {
            return qz.websocket.disconnect();
        },
        connect_to_nw_printer: function (resolve = null) {
            var self = this;
            // self.setLoadingMessage(_t('Connecting to the Network Printer'),0);
            return self.disconnect_from_printer().finally(function (e) {
                return self.connect_to_printer();
            })
        },
        auto_sync_printer: function (printer_name) {
            var self = this;
            if (printer_name) {
                self.printer_name = printer_name
                self.connect_to_nw_printer();
            }
        },

        _printDoc: function (event) {
            var self = this;
            event.preventDefault();
            if (self.doc_print_data && self.doc_print_data.printer_type === "network") {
                self.print_network_printer(self.doc_print_data.id, self.formData.res_id, self.doc_print_data.printer_name);
            } else if (self.doc_print_data && self.doc_print_data.printer_type === "thermal") {
                self.print_thermal_printer(self.doc_print_data.id, self.formData.res_id, self.doc_print_data.printer_name);
            }
        },
        print_network_printer: function (id, res_id, printer_name) {
            var self = this;
            self.printer_name = printer_name;
            rpc.query({
                model: 'odoo.doc.printer',
                method: 'get_doc_pdf',
                args: [{ "odoo_doc_printer_id": id, "res_id": res_id }]
            })
                .catch(function (error) {
                    throw Error("Please make sure you are connected to the network");
                })
                .then(function (base64data) {
                    if (self.printer_name) {
                        if (!qz.websocket.isActive()) {
                            self.connect_to_nw_printer().finally(function () {
                                if (self.remote_status == "success") {
                                    var config = qz.configs.create(self.printer_name);
                                    var data = [{
                                        type: 'pdf',
                                        format: 'base64',
                                        data: base64data,
                                    }]
                                    // { type: 'raw', format: 'image', data: receipt_data.receipt.company.logo, options: { language: "ESCPOS", dotDensity: 'double'} },
                                    qz.print(config, data).then(function () { }).catch(function (e) {
                                        console.error(e);
                                    });
                                }
                            })
                        } else {
                            var config = qz.configs.create(self.printer_name);
                            var data = [{
                                type: 'pdf',
                                format: 'base64',
                                data: base64data,
                            }]
                            // { type: 'raw', format: 'image', data: receipt_data.receipt.company.logo, options: { language: "ESCPOS", dotDensity: 'double'} },
                            qz.print(config, data).then(function () { }).catch(function (e) {
                                console.error(e);
                            });
                        }
                    }
                });
        },
        print_thermal_printer: function (id, res_id, printer_name) {
            var self = this;
            self.printer_name = printer_name;
            rpc.query({
                model: 'odoo.doc.printer',
                method: 'get_prepared_data',
                args: [{ "odoo_doc_printer_id": id, "res_id": res_id }]
            }).then(function (data) {
                if (data) {
                    var receipt = false;
                    if (self.formData && self.formData.model === "account.move") {
                        var receipt = QWeb.render('InvoiceXmlTemplate', {
                            o: data.invoice[0],
                            company: data.company[0],
                            partner: data.partner[0],
                            lines: data.lines,
                            qr_code_urls: data.qr_code_urls,
                            payment_term: data.payment_term[0],
                            invoice_incoterm: data.invoice_incoterm[0],
                            fiscal_position: data.fiscal_position[0],
                            taxes: data.taxes,
                            in_currency: data.currency[0],
                            payment_vals: data.payment_vals,
                            display_discount: data.display_discount,
                            tax_totals: data.tax_totals,
                            is_narration_empty: data.is_narration_empty,
                            is_fiscal_empty: data.is_fiscal_empty,
                        });
                    } else if (self.formData && self.formData.model === "sale.order") {
                        var receipt = QWeb.render('saleOrderXmlReceipt', {
                            doc: data.doc[0],
                            company: data.company[0],
                            partner: data.partner[0],
                            partner_invoice_id: data.partner_invoice_id[0],
                            partner_shipping_id: data.partner_shipping_id[0],
                            is_pro_forma: data.is_pro_forma,
                            order_line: data.order_line,
                            in_currency: data.currency[0],
                            taxes: data.taxes,
                            tax_totals: data.tax_totals,
                            signature_path: data.signature_path,
                            is_fiscal_empty: data.is_fiscal_empty,
                        });
                    } else if (self.formData && self.formData.model === "purchase.order") {
                        var receipt = QWeb.render('purchaseOrderXmlReceipt', {
                            o: data.doc[0],
                            company: data.company[0],
                            partner: data.partner[0],
                            partner_shipping_id: data.partner_shipping_id[0],
                            order_line: data.order_line,
                            in_currency: data.currency[0],
                            taxes: data.taxes,
                            tax_totals: data.tax_totals,
                        });
                    }
                    if (receipt) {
                        rpc.query({
                            model: 'odoo.doc.printer',
                            method: 'get_esc_command_set',
                            args: [{ "data": receipt }]
                        })
                            .then(function (esc_commands) {
                                var esc = esc_commands.replace("\n", "\x0A")
                                var printer_name = self.printer_name;
                                if (!qz.websocket.isActive()) {
                                    self.connect_to_nw_printer().finally(function () {
                                        if (self.remote_status == "success") {
                                            var config = qz.configs.create(self.printer_name);
                                            var data = [esc]
                                            // { type: 'raw', format: 'image', data: receipt_data.receipt.company.logo, options: { language: "ESCPOS", dotDensity: 'double'} },
                                            qz.print(config, data).then(function () { }).catch(function (e) {
                                                console.error(e);
                                            });
                                        }
                                    })
                                } else {
                                    var config = qz.configs.create(self.printer_name);
                                    var data = [esc]
                                    // { type: 'raw', format: 'image', data: receipt_data.receipt.company.logo, options: { language: "ESCPOS", dotDensity: 'double'} },
                                    qz.print(config, data).then(function () { });
                                }
                            });
                    }
                }

            })
        },

    });
    return PrintButtonWidget;
});