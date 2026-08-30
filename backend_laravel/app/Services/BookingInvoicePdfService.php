<?php

namespace App\Services;

use Dompdf\Dompdf;
use Dompdf\Options;

class BookingInvoicePdfService
{
    public function render(array $invoice): string
    {
        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $html = view('pdf.booking-invoice', ['invoice' => $invoice])->render();

        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }
}
