# -*- coding: utf-8 -*-

from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    allow_auto_sync = fields.Boolean('Auto Sync', config_parameter="enable_auto_sync", help="Allow auto sync with the attached printer")
    printer_name = fields.Char('Printer Name' ,  config_parameter="default_printer_name", help="Provide the printer name for auto sync")
