<?php
/**
 * mail_helper.php - Centralized mailing utility (Self-Contained SMTP with Diagnostics)
 */

function sendMail($to, $subject, $message, $attachments = [], $cc = [], $bcc = []) {
    // 1. Detect the clean domain
    $host = preg_replace('/^www\./', '', explode(':', $_SERVER['HTTP_HOST'] ?? 'localhost')[0]);
    
    // 2. Determine the "From" address
    $fromName = "Portfolio Admin";
    if (defined('MAIL_DRIVER') && MAIL_DRIVER === 'smtp' && defined('SMTP_USER') && !empty(SMTP_USER)) {
        $fromEmail = SMTP_USER;
    } else {
        $fromEmail = "no-reply@" . (strpos($host, '.') !== false ? $host : "deepakmandal.dev");
    }

    $driver = defined('MAIL_DRIVER') ? MAIL_DRIVER : 'mail'; 

    if ($driver === 'mail') {
        $boundary = "PHP-mixed-".md5(time());
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "From: {$fromName} <{$fromEmail}>\r\n";
        $headers .= "Reply-To: {$fromEmail}\r\n";
        $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        $body = "--{$boundary}\r\n";
        $body .= "Content-type:text/html;charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $body .= $message . "\r\n\r\n";

        foreach ($attachments as $path) {
            if (is_file($path)) {
                $name = basename($path);
                $fileContent = chunk_split(base64_encode(file_get_contents($path)));
                $body .= "--{$boundary}\r\n";
                $body .= "Content-Type: application/octet-stream; name=\"{$name}\"\r\n";
                $body .= "Content-Description: {$name}\r\n";
                $body .= "Content-Disposition: attachment; filename=\"{$name}\"; size=".filesize($path).";\r\n";
                $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
                $body .= $fileContent . "\r\n\r\n";
            }
        }
        $body .= "--{$boundary}--";

        $success = @mail($to, $subject, $body, $headers);
        logMail($to, $success ? "SUCCESS (mail)" : "FAILED (mail)");
        return $success;
    }

    if ($driver === 'smtp') {
        return sendNativeSMTP($to, $subject, $message, $fromEmail, $fromName, [], $errorOut, $attachments, $cc, $bcc);
    }
    return false;
}

/**
 * Lightweight Native SMTP Client with Detailed Diagnostics
 */
function sendNativeSMTP($to, $subject, $message, $fromEmail, $fromName, $overrides = [], &$errorOut = null, $attachments = [], $cc = [], $bcc = []) {
    $smtpHost = trim($overrides['host'] ?? (defined('SMTP_HOST') ? SMTP_HOST : ''));
    $smtpPort = (int)($overrides['port'] ?? (defined('SMTP_PORT') ? SMTP_PORT : 587));
    $smtpUser = trim($overrides['user'] ?? (defined('SMTP_USER') ? SMTP_USER : ''));
    
    $rawPass  = $overrides['pass'] ?? (defined('SMTP_PASS') ? SMTP_PASS : '');
    $smtpPass = trim(str_replace("\xc2\xa0", " ", $rawPass));
    
    $smtpEnc  = strtolower($overrides['enc']  ?? (defined('SMTP_ENC')  ? SMTP_ENC : 'tls'));

    $log = [];
    $log[] = "Starting SMTP session to $smtpHost:$smtpPort ($smtpEnc)";

    try {
        if (($smtpEnc === 'ssl' || $smtpPort === 465) && !extension_loaded('openssl')) {
            throw new Exception("PHP OpenSSL extension is not enabled on your server.");
        }

        $socketHost = ($smtpEnc === 'ssl' || $smtpPort === 465) ? "ssl://$smtpHost" : $smtpHost;
        $socket = @fsockopen($socketHost, $smtpPort, $errno, $errstr, 15);
        
        if (!$socket) {
            $msg = $errstr ? "$errstr ($errno)" : "Connection timed out";
            throw new Exception("Connection Failed: $msg");
        }

        stream_set_timeout($socket, 10);

        $read = function() use ($socket, &$log) {
            $data = "";
            while ($str = fgets($socket, 515)) {
                $data .= $str;
                if (substr($str, 3, 1) == " ") break;
            }
            $log[] = "S: " . trim($data);
            return $data;
        };

        $write = function($cmd, $mask = false) use ($socket, &$log) {
            $log[] = "C: " . ($mask ? "********" : $cmd);
            fputs($socket, $cmd . "\r\n");
        };

        $read(); 
        $write("EHLO " . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
        $read();

        if ($smtpEnc === 'tls') {
            $write("STARTTLS");
            $resp = $read();
            if (strpos($resp, '220') === false) throw new Exception("STARTTLS Rejected");
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception("Encryption Handshake Failed");
            }
            $write("EHLO " . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
            $read();
        }

        $write("AUTH LOGIN");
        $read();
        $write(base64_encode($smtpUser), true);
        $read();
        $write(base64_encode($smtpPass), true);
        $response = $read();

        if (strpos($response, '235') === false) throw new Exception("Authentication Denied");

        $write("MAIL FROM: <$smtpUser>");
        $read();
        $write("RCPT TO: <$to>");
        $read();
        
        // Handle CC
        foreach ($cc as $c) {
            if (!empty(trim($c))) {
                $write("RCPT TO: <" . trim($c) . ">");
                $read();
            }
        }
        
        // Handle BCC
        foreach ($bcc as $b) {
            if (!empty(trim($b))) {
                $write("RCPT TO: <" . trim($b) . ">");
                $read();
            }
        }

        $write("DATA");
        $read();

        $boundary = "PHP-mixed-".md5(time());
        $headers = [
            "MIME-Version: 1.0",
            "From: \"$fromName\" <$fromEmail>",
            "To: <$to>",
            "Subject: $subject",
            "Date: " . date('r'),
            "Content-Type: multipart/mixed; boundary=\"$boundary\"",
            "X-Mailer: Native PHP SMTP v2.1"
        ];

        if (!empty($cc)) {
            $headers[] = "Cc: " . implode(', ', array_map('trim', $cc));
        }

        $body = "--$boundary\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $body .= $message . "\r\n\r\n";

        foreach ($attachments as $path) {
            if (is_file($path)) {
                $name = basename($path);
                $content = chunk_split(base64_encode(file_get_contents($path)));
                $body .= "--$boundary\r\n";
                $body .= "Content-Type: application/octet-stream; name=\"$name\"\r\n";
                $body .= "Content-Description: $name\r\n";
                $body .= "Content-Disposition: attachment; filename=\"$name\"; size=".filesize($path).";\r\n";
                $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
                $body .= $content . "\r\n\r\n";
            }
        }
        $body .= "--$boundary--";

        // Dot-stuffing
        $safeBody = str_replace("\n.", "\n..", $body);
        if (strpos($safeBody, ".") === 0) $safeBody = "." . $safeBody;

        $write(implode("\r\n", $headers) . "\r\n\r\n" . $safeBody . "\r\n.");
        $resp = $read();
        
        if (strpos($resp, '250') === false) throw new Exception("Message Rejected");

        $write("QUIT");
        $read();
        fclose($socket);

        logMail($to, "SUCCESS (native-smtp)");
        return true;

    } catch (Exception $e) {
        $errorMsg = $e->getMessage();
        if ($errorOut !== null) $errorOut = $errorMsg;
        logMail($to, "SMTP ERROR: " . $errorMsg);
        return false;
    }
}

function logMail($to, $result) {
    $logFile = __DIR__ . '/mail_log.txt';
    $logMsg = date('[Y-m-d H:i:s]') . " To: {$to} | Result: {$result}\n";
    file_put_contents($logFile, $logMsg, FILE_APPEND);
}
