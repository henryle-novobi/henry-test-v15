# -*- coding: utf-8 -*-
#################################################################################
# Author      : Webkul Software Pvt. Ltd. (<https://webkul.com/>)
# Copyright(c): 2015-Present Webkul Software Pvt. Ltd.
# All Rights Reserved.
#
#
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#
# You should have received a copy of the License along with this program.
# If not, see <https://store.webkul.com/license.html/>
#################################################################################
{
  "name"                 :  "Odoo Document Printer via QZ Tray",
  "summary"              :  "Odoo Document Printer via QZ Tray Module allows you to directly print the Odoo reports such as sale, purchase, and invoice report/receipts, etc. using QZ Tray Client and eliminate the need to first download it as a PDF.",
  "category"             :  "Point of Sale",
  "version"              :  "1.0.0",
  "author"               :  "Webkul Software Pvt. Ltd.",
  "license"              :  "Other proprietary",
  "website"              :  "https://store.webkul.com/",
  "live_test_url":  "http://odoodemo.webkul.com/?module=odoo_document_printer",
  "description"          :  """
  Odoo Document Printer via QZ Tray Module, Odoo Document Printer via QZ Tray, 
  Print purchase order, 
  print sales order, 
  print receipt, print reports in Odoo,
  Print documents in Odoo""",
  "depends"              :  ['web','mail', 'sale', 'purchase','account'],
  "data"                 :  [
                              'security/ir.model.access.csv',
                             'data/data.xml',
                             'views/odoo_doc_printer_view.xml',
                             'views/inherit_res_config_settings_views.xml',
                            ],
  'assets': {
        'web.assets_backend': [
            "/odoo_document_printer/static/src/js/lib/qz-tray.js",
            "/odoo_document_printer/static/src/js/lib/rsvp-3.1.0.min.js",
            "/odoo_document_printer/static/src/js/lib/sha-256.min.js",
            "/odoo_document_printer/static/src/js/syncPrinterWidget.js",
            "/odoo_document_printer/static/src/scss/doc_print.scss",
            "/odoo_document_printer/static/src/js/print_button_widget.js",
            "/odoo_document_printer/static/src/js/inheritFormRenderer.js",
        ],
        'web.assets_qweb': [
            'odoo_document_printer/static/src/xml/**/*',
        ],
    },
  "images"               :  ['static/description/banner.gif'],
  "application"          :  True,
  "installable"          :  True,
  "auto_install"         :  False,
  "price"                :  99,
  "currency"             :  "USD",
  "pre_init_hook"        :  "pre_init_check",
}