#!/bin/bash

scp -r dist/* iav@199.169.3.9:/var/www/html/workorder-pti
scp -P 2344 -r dist/* iav@192.168.0.11:/home/pdam/httpd/workorder-pti