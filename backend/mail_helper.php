<?php
/**
 * mail_helper.php - Centralized mailing utility (Self-Contained SMTP with Diagnostics)
 */

function sendMail($to, $subject, $message) {
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
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8\r\n";
        $headers .= "From: {$fromName} <{$fromEmail}>\r\n";
        $headers .= "Reply-To: {$fromEmail}\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        $success = @mail($to, $subject, $message, $headers);
        logMail($to, $success ? "SUCCESS (mail)" : "FAILED (mail)");
        return $success;
    }

    if ($driver === 'smtp') {
        return sendNativeSMTP($to, $subject, $message, $fromEmail, $fromName);
    }
    return false;
}

/**
 * Lightweight Native SMTP Client with Detailed Diagnostics
 */
function sendNativeSMTP($to, $subject, $message, $fromEmail, $fromName, $overrides = [], &$errorOut = null) {
    $smtpHost = $overrides['host'] ?? (defined('SMTP_HOST') ? SMTP_HOST : '');
    $smtpPort = (int)($overrides['port'] ?? (defined('SMTP_PORT') ? SMTP_PORT : 587));
    $smtpUser = $overrides['user'] ?? (defined('SMTP_USER') ? SMTP_USER : '');
    $smtpPass = $overrides['pass'] ?? (defined('SMTP_PASS') ? SMTP_PASS : '');
    $smtpEnc  = strtolower($overrides['enc']  ?? (defined('SMTP_ENC')  ? SMTP_ENC : 'tls'));

    $log = [];
    $log[] = "Starting SMTP session to $smtpHost:$smtpPort ($smtpEnc)";

    try {
        if (($smtpEnc === 'ssl' || $smtpPort === 465) && !extension_loaded('openssl')) {
            throw new Exception("PHP OpenSSL extension is not enabled on your server. Encrypted mail (SSL/TLS) requires it.");
        }

        $socketHost = ($smtpEnc === 'ssl' || $smtpPort === 465) ? "ssl://$smtpHost" : $smtpHost;
        $socket = @fsockopen($socketHost, $smtpPort, $errno, $errstr, 15);
        
        if (!$socket) {
            $msg = $errstr ? "$errstr ($errno)" : "Connection timed out";
            throw new Exception("Connection Failed: $msg. Hint: Your host might be blocking port $smtpPort.");
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

        $read(); // Server Banner
        $write("EHLO " . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
        $read();

        if ($smtpEnc === 'tls') {
            $write("STARTTLS");
            $resp = $read();
            if (strpos($resp, '220') === false) throw new Exception("STARTTLS Rejected: $resp");
            
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception("Encryption Handshake Failed. Your PHP version might not support this TLS level.");
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

        if (strpos($response, '235') === false) {
            throw new Exception("Authentication Denied. Ensure you are using a GOOGLE APP PASSWORD, not your login password.");
        }

        $write("MAIL FROM: <$smtpUser>");
        $read();
        $write("RCPT TO: <$to>");
        $read();
        $write("DATA");
        $read();

        $headers = [
            "MIME-Version: 1.0",
            "Content-type: text/html; charset=UTF-8",
            "From: \"$fromName\" <$fromEmail>",
            "To: <$to>",
            "Subject: $subject",
            "Date: " . date('r'),
            "X-Mailer: Native PHP SMTP v2.1"
        ];

        // Dot-stuffing: Any line starting with a dot must have an extra dot added
        $safeMessage = str_replace("\n.", "\n..", $message);
        if (strpos($safeMessage, ".") === 0) $safeMessage = "." . $safeMessage;

        $write(implode("\r\n", $headers) . "\r\n\r\n" . $safeMessage . "\r\n.");
        $resp = $read();
        
        if (strpos($resp, '250') === false) throw new Exception("Message Rejected: $resp");

        $write("QUIT");
        $read();
        fclose($socket);

        logMail($to, "SUCCESS (native-smtp)");
        return true;

    } catch (Exception $e) {
        $errorMsg = $e->getMessage();
        if ($errorOut !== null) $errorOut = $errorMsg;
        logMail($to, "SMTP ERROR: " . $errorMsg . " | Session: " . implode(" > ", $log));
        return false;
    }
}

function logMail($to, $result) {
    $logFile = __DIR__ . '/mail_log.txt';
    $logMsg = date('[Y-m-d H:i:s]') . " To: {$to} | Result: {$result}\n";
    file_put_contents($logFile, $logMsg, FILE_APPEND);
}
