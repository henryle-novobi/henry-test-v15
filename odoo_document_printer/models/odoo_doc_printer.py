# -*- coding: utf-8 -*-
#################################################################################
#
#   Copyright (c) 2016-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>)
#   See LICENSE file for full copyright and licensing details.
#   License URL : <https://store.webkul.com/license.html/>
#
#################################################################################

from odoo.tools.translate import _
from odoo import api, fields, models
from odoo.exceptions import UserError, ValidationError
from . escpos import escpos
import logging
import base64
import json
import re

_logger = logging.getLogger(__name__)

FILETYPE_BASE64_MAGICWORD = {
    b'/': 'jpg',
    b'R': 'gif',
    b'i': 'png',
    b'P': 'svg+xml',
}



class OdooDocPrinter(models.Model):
    _name = 'odoo.doc.printer'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = "Odoo Doc Printer Record"
    
    name = fields.Char("Name")
    model_id = fields.Many2one("ir.model", "Model", ondelete='cascade', domain=[('model', 'in', ('sale.order', 'purchase.order', 'account.move'))])
    report_id = fields.Many2one("ir.actions.report", "Report")
    model_name = fields.Char(related="model_id.model", store=True)
    printer_type = fields.Selection([
        ('thermal', 'Thermal Printer'),
        ('network', 'Network Printer'),
    ], default='network', tracking=True, required=True)
    printer_name = fields.Char("Printer Name", tracking=True, required=True)
    active = fields.Boolean("Active", tracking=True, default=True)

    @api.model
    def get_esc_command_set(self, data):
        printer = escpos.Escpos()
        printer.receipt(data.get("data"))
        return printer.esc_commands

    @api.model
    def get_doc_pdf(self,kwargs):
        if kwargs.get('odoo_doc_printer_id'):
            doc_obj = self.sudo().browse(kwargs.get('odoo_doc_printer_id'))
            if doc_obj.exists() and doc_obj.report_id:
                pdf = doc_obj.report_id._render_qweb_pdf(kwargs.get('res_id'))[0]
                pdf = base64.b64encode(pdf)
                if pdf:
                    return pdf
        return False


    @api.model
    def get_prepared_data(self,kwargs):
        if kwargs.get('odoo_doc_printer_id'):
            doc_obj = self.sudo().browse(kwargs.get('odoo_doc_printer_id'))
            if doc_obj.exists() and kwargs.get('res_id'):
                current_model_data = self.env[doc_obj.model_name].sudo().browse(kwargs.get('res_id'))
                if current_model_data.exists() and doc_obj.model_name == "account.move":
                    return self.prepare_invoice_data_vals(current_model_data)
                elif current_model_data.exists() and doc_obj.model_name == "sale.order":
                    return self. prepare_sale_data_vals(current_model_data)
                elif current_model_data.exists() and doc_obj.model_name == "purchase.order":
                    return self. prepare_purchase_data_vals(current_model_data)
        return False
    
    def prepare_invoice_data_vals(self, current_model_data):
        qr_code_urls = {}
        taxes = {}
        new_code_url = current_model_data.generate_qr_code()
        display_discount = any(l.discount for l in current_model_data.invoice_line_ids)
        tax_totals = json.loads(current_model_data.tax_totals_json)
        if new_code_url:
            qr_code_urls[current_model_data.id] = new_code_url
        lines = current_model_data.invoice_line_ids.sorted(key=lambda l: (-l.sequence, l.date, l.move_name, -l.id), reverse=True)
        for line in lines:
            taxes[line.id] =  ', '.join(map(lambda x: (x.description or x.name), line.tax_ids))
        vals = {
        'company' : current_model_data.company_id.read(),
        'partner' : current_model_data.partner_id.read(),
        'invoice' : current_model_data.read(),
        'payment_term' : current_model_data.invoice_payment_term_id.read(),
        'invoice_incoterm' : current_model_data.invoice_incoterm_id.read(),
        'fiscal_position' : current_model_data.fiscal_position_id.read(),
        'lines' : lines.read(),
        'qr_code_urls': qr_code_urls,
        'taxes': taxes,
        'currency': current_model_data.currency_id.read(),
        'payment_vals': current_model_data.sudo()._get_reconciled_info_JSON_values(),
        'display_discount': display_discount,
        'tax_totals': tax_totals,
        'is_narration_empty': self.is_html_empty(current_model_data.narration) if current_model_data.narration else True,
        'is_fiscal_empty': self.is_html_empty(current_model_data.fiscal_position_id.note) if current_model_data.fiscal_position_id else True,
        }
        return vals
    
    def prepare_sale_data_vals(self, current_model_data):
        taxes = {}
        for line in current_model_data.order_line:
            taxes[line.id] =  ', '.join(map(lambda x: (x.description or x.name), line.tax_id))
        display_discount = any(l.discount for l in current_model_data.order_line)
        tax_totals = json.loads(current_model_data.tax_totals_json)
        vals = {
        "doc": current_model_data.read(),
        'company' : current_model_data.company_id.read(),
        'partner' : current_model_data.partner_id.read(),
        "partner_invoice_id": current_model_data.partner_invoice_id.read(),
        "partner_shipping_id": current_model_data.partner_shipping_id.read(),
        "sale_currency": current_model_data.currency_id.read(),
        "display_discount": display_discount,
        "is_proforma": self.env.context.get('proforma', False),
        "order_line": current_model_data.order_line.read(),
        'currency': current_model_data.currency_id.read(),
        'taxes': taxes,
        'tax_totals': tax_totals,
        "signature_path": self.image_data_uri(current_model_data.signature) if current_model_data.signature else "",
        'is_fiscal_empty': self.is_html_empty(current_model_data.fiscal_position_id.note) if current_model_data.fiscal_position_id else True,
        }
        return vals
    
    def prepare_purchase_data_vals(self, current_model_data):
        taxes = {}
        for line in current_model_data.order_line:
            taxes[line.id] =  ', '.join(map(lambda x: (x.description or x.name), line.taxes_id))
        tax_totals = json.loads(current_model_data.tax_totals_json)
        vals = {
        "doc": current_model_data.read(),
        'company' : current_model_data.company_id.read(),
        'partner' : current_model_data.partner_id.read(),
        "partner_shipping_id": current_model_data.dest_address_id.read(),
        "order_line": current_model_data.order_line.read(),
        'currency': current_model_data.currency_id.read(),
        'taxes': taxes,
        'tax_totals': tax_totals,
        }
        return vals

    @api.model
    def get_config_data(self):
        auto_sync = self.env['ir.config_parameter'].sudo().get_param('enable_auto_sync')
        if auto_sync:
            return self.env['ir.config_parameter'].sudo().get_param('default_printer_name')
        else:
            return False
        
        
    @api.constrains('active')
    def _check_active_records(self):
        if self.active and self.model_id:
            count = self.search_count([('model_id', '=', self.model_id.id)])
            if count > 1:
                raise ValidationError(_('Only one record should be active for each model.'))
            
            
    def is_html_empty(self,html_content):
        """Check if a html content is empty. If there are only formatting tags with style
        attributes or a void content  return True. Famous use case if a
        '<p style="..."><br></p>' added by some web editor.

        :param str html_content: html content, coming from example from an HTML field
        :returns: bool, True if no content found or if containing only void formatting tags
        """
        if not html_content:
            return True
        tag_re = re.compile(r'\<\s*\/?(?:p|div|span|br|b|i|font)(?:(?=\s+\w*)[^/>]*|\s*)/?\s*\>')
        return not bool(re.sub(tag_re, '', html_content).strip())
    
    
    def image_data_uri(self, base64_source):
        """This returns data URL scheme according RFC 2397
        (https://tools.ietf.org/html/rfc2397) for all kind of supported images
        (PNG, GIF, JPG and SVG), defaulting on PNG type if not mimetype detected.
        """
        return 'data:image/%s;base64,%s' % (
            FILETYPE_BASE64_MAGICWORD.get(base64_source[:1], 'png'),
            base64_source.decode(),
        )