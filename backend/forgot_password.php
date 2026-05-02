<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/mail_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db     = getDb();

// ── Self-healing: Ensure columns exist ────────────────────────────────────
if (!function_exists('ensureColumn')) {
    function ensureColumn($db, $table, $column, $definition) {
        try {
            $db->query("SELECT $column FROM $table LIMIT 1");
        } catch (PDOException $e) {
            if ($e->getCode() === '42S22') {
                try {
                    $db->exec("ALTER TABLE $table ADD COLUMN $column $definition");
                } catch (PDOException $ex) {
                    // Ignore
                }
            }
        }
    }
}
ensureColumn($db, 'admin_users', 'reset_token', "VARCHAR(100) DEFAULT '' AFTER two_factor_enabled");
ensureColumn($db, 'admin_users', 'reset_token_expiry', "DATETIME DEFAULT NULL AFTER reset_token");

if ($method === 'POST') {
    $body = getRequestBody();

    // 1. Request Reset
    if ($action === 'request') {
        $email = trim($body['email'] ?? '');
        if (!$email) errorResponse('Email is required.');

        $stmt = $db->prepare('SELECT id FROM admin_users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        $logFile = __DIR__ . '/mail_log.txt';
        $logMsg = date('[Y-m-d H:i:s]') . " --- Reset Request for {$email} ---\n";
        if (!$user) {
            $logMsg .= "DEBUG: User NOT found in database for email: {$email}\n";
        } else {
            $logMsg .= "DEBUG: User found (ID: {$user['id']})\n";
        }
        file_put_contents($logFile, $logMsg, FILE_APPEND);

        if (!$user) {
            errorResponse('This email address isn\'t registered with an admin account. Please double-check for any typos and try again.', 404);
        }

        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiry = date('Y-m-d H:i:s', time() + 600); // 10 minutes for OTP

        $stmt = $db->prepare('UPDATE admin_users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?');
        $stmt->execute([$otp, $expiry, $user['id']]);

        // Capture requester details for security
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown Device';
        $device = 'Unknown';
        if (strpos($userAgent, 'Windows') !== false) $device = 'Windows PC';
        elseif (strpos($userAgent, 'iPhone') !== false) $device = 'iPhone';
        elseif (strpos($userAgent, 'Android') !== false) $device = 'Android Device';
        elseif (strpos($userAgent, 'Macintosh') !== false) $device = 'MacBook/iMac';
        elseif (strpos($userAgent, 'Linux') !== false) $device = 'Linux System';

        // Send Premium Redesigned Email
        $siteName = "Portfolio CMS"; 
        $subject = "Verify Your Identity - {$siteName}";
        $message = "
            <html>
            <body style='margin: 0; padding: 0; background-color: #f6f9fc; font-family: \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f6f9fc; padding: 40px 20px;'>
                    <tr>
                        <td align='center'>
                            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>
                                <!-- Header -->
                                <tr>
                                    <td style='background: linear-gradient(135deg, #1565C0 0%, #1e88e5 100%); padding: 40px 40px 30px; text-align: center;'>
                                        <div style='display: inline-block; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 20px;'>
                                            <span style='color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;'>Portfolio Admin</span>
                                        </div>
                                        <h1 style='color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; opacity: 0.9;'>Identity Verification</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style='padding: 40px;'>
                                        <p style='margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a5568;'>Hello,</p>
                                        <p style='margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568;'>A sign-in or password reset request was made for your account. Please use the verification code below to continue.</p>
                                        
                                        <div style='background-color: #f8fbff; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;'>
                                            <div style='font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #1565C0; margin-bottom: 10px;'>{$otp}</div>
                                            <div style='font-size: 13px; font-weight: 600; color: #718096; text-transform: uppercase; letter-spacing: 1px;'>Valid for 10 minutes only</div>
                                        </div>

                                        <!-- Device Info -->
                                        <div style='background-color: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 30px; border: 1px solid #edf2f7;'>
                                            <div style='font-size: 12px; font-weight: 700; color: #a0aec0; text-transform: uppercase; margin-bottom: 8px;'>Request Details</div>
                                            <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                                                <tr>
                                                    <td style='font-size: 13px; color: #4a5568; padding: 2px 0;'><strong>Device:</strong> {$device}</td>
                                                </tr>
                                                <tr>
                                                    <td style='font-size: 13px; color: #4a5568; padding: 2px 0;'><strong>IP Address:</strong> {$ipAddress}</td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        <p style='margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #718096; background: #fff5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #f56565;'>
                                            <strong>Safety Tip:</strong> Never share this code with anyone. Our support team will never ask for your OTP or password via email.
                                        </p>
                                    </td>
                                </tr>
                                   </p>
                                     <!-- Footer / Author Details -->
                                <tr>
                                    <td style='background-color: #f8fafc; padding: 40px; border-top: 1px solid #edf2f7;'>
                                        <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                                            <tr>
                                                <td>
                                                    <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                                                        <tr>
                                                            <td width='80' valign='top' style='padding-right: 20px;'>
                                                                <img src='https://avatars.githubusercontent.com/u/1?v=4' width='80' height='80' style='border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.1);' alt='Deepak Mandal'>
                                                            </td>
                                                            <td valign='top'>
                                                                <div style='font-size: 16px; font-weight: 700; color: #2d3748; margin-bottom: 4px;'>Deepak Mandal</div>
                                                                <div style='font-size: 12px; font-weight: 600; color: #1565C0; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;'>Full Stack Developer & System Architect</div>
                                                                <p style='margin: 0; font-size: 13px; line-height: 1.5; color: #718096;'>
                                                                    Passionate about building high-performance web applications and premium digital experiences. Specialist in React, Node.js, and Modern UI/UX.
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <div style='margin-top: 25px; margin-bottom: 25px;'>
                                                        <a href='https://deepakmandal.dev' style='display: inline-block; background-color: #1565C0; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; box-shadow: 0 4px 12px rgba(21, 101, 192, 0.2);'>Visit Official Website</a>
                                                    </div>

                                                    <div style='padding-top: 20px; border-top: 1px solid #e2e8f0;'>
                                                        <span style='font-size: 12px; color: #a0aec0; margin-right: 15px;'>Connect with me:</span>
                                                        <a href='#' style='text-decoration: none; margin-right: 12px;'><img src='https://cdn-icons-png.flaticon.com/32/145/145807.png' width='18' height='18' alt='LinkedIn'></a>
                                                        <a href='#' style='text-decoration: none; margin-right: 12px;'><img src='https://cdn-icons-png.flaticon.com/32/733/733553.png' width='18' height='18' alt='GitHub'></a>
                                                        <a href='#' style='text-decoration: none;'><img src='https://cdn-icons-png.flaticon.com/32/3256/3256013.png' width='18' height='18' alt='Twitter'></a>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style='padding-top: 40px; text-align: center;'>
                                                    <p style='font-size: 11px; color: #cbd5e0; margin: 0;'>© " . date('Y') . " Portfolio CMS. Handcrafted by Deepak Mandal.</p>
                                                    <p style='font-size: 10px; color: #cbd5e0; margin: 5px 0 0;'>This is an automated security email. Please do not reply.</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                 </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        ";

        $sendResult = sendMail($email, $subject, $message);

        if (!$sendResult) {
            errorResponse('Account verified, but the reset email couldn\'t be sent. Please try again.', 500);
        }

        jsonResponse(['success' => true, 'message' => 'OTP has been sent to your email!']);
    }

    // 2. Verify OTP (Step 2 of 3)
    if ($action === 'verify-otp') {
        $otp = trim($body['otp'] ?? '');
        if (!$otp) errorResponse('OTP is required.');

        $stmt = $db->prepare('SELECT id FROM admin_users WHERE reset_token = ? AND reset_token_expiry > NOW() LIMIT 1');
        $stmt->execute([$otp]);
        $user = $stmt->fetch();

        if (!$user) {
            errorResponse('Invalid or expired OTP.', 400);
        }

        jsonResponse(['success' => true, 'message' => 'OTP verified. Please set your new password.']);
    }

    // 3. Reset Password (Step 3 of 3)
    if ($action === 'reset') {
        $otp = trim($body['otp'] ?? '');
        $password = $body['password'] ?? '';

        if (!$otp || !$password) errorResponse('OTP and new password are required.');
        if (strlen($password) < 8) errorResponse('Password must be at least 8 characters.');

        $stmt = $db->prepare('SELECT id, email FROM admin_users WHERE reset_token = ? AND reset_token_expiry > NOW() LIMIT 1');
        $stmt->execute([$otp]);
        $user = $stmt->fetch();

        if (!$user) {
            errorResponse('Invalid or expired OTP.', 400);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('UPDATE admin_users SET password_hash = ?, reset_token = "", reset_token_expiry = NULL WHERE id = ?');
        $stmt->execute([$hash, $user['id']]);

        // Capture requester details for security
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown Device';
        $device = 'Unknown';
        if (strpos($userAgent, 'Windows') !== false) $device = 'Windows PC';
        elseif (strpos($userAgent, 'iPhone') !== false) $device = 'iPhone';
        elseif (strpos($userAgent, 'Android') !== false) $device = 'Android Device';
        elseif (strpos($userAgent, 'Macintosh') !== false) $device = 'MacBook/iMac';
        elseif (strpos($userAgent, 'Linux') !== false) $device = 'Linux System';

        // Notify user of successful change (Security Alert)
        $siteName = "Portfolio CMS";
        $subject = "Security Alert: Password Changed Successfully";
        $message = "
            <html>
            <body style='margin: 0; padding: 0; background-color: #f6f9fc; font-family: \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f6f9fc; padding: 40px 20px;'>
                    <tr>
                        <td align='center'>
                            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>
                                <!-- Header -->
                                <tr>
                                    <td style='background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 40px 30px; text-align: center;'>
                                        <div style='display: inline-block; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 20px;'>
                                            <img src='https://cdn-icons-png.flaticon.com/64/190/190411.png' width='32' height='32' alt='Success'>
                                        </div>
                                        <h1 style='color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; opacity: 0.9;'>Security Confirmation</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style='padding: 40px;'>
                                        <p style='margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a5568;'>Hello,</p>
                                        <p style='margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568;'>This is an automated confirmation that your account password has been successfully changed. If you performed this action, no further steps are required.</p>
                                        
                                        <div style='background-color: #f0fff4; border: 1px solid #c6f6d5; border-radius: 12px; padding: 25px; margin-bottom: 30px;'>
                                            <div style='font-size: 12px; font-weight: 700; color: #276749; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;'>Activity Log</div>
                                            <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                                                <tr>
                                                    <td style='padding: 3px 0; font-size: 14px; color: #38a169;'><strong>Device:</strong> {$device}</td>
                                                </tr>
                                                <tr>
                                                    <td style='padding: 3px 0; font-size: 14px; color: #38a169;'><strong>IP Address:</strong> {$ipAddress}</td>
                                                </tr>
                                                <tr>
                                                    <td style='padding: 3px 0; font-size: 14px; color: #38a169;'><strong>Time:</strong> " . date('Y-m-d H:i:s T') . "</td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        <div style='margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #718096; background: #fff5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #f56565;'>
                                            <p style='margin: 0 0 10px; color: #c53030; font-weight: 700;'>Didn't make this change?</p>
                                            <p style='margin: 0;'>If you don't recognize this activity, please contact your system administrator or <a href='mailto:support@deepakmandal.dev' style='color: #c53030; font-weight: 700; text-decoration: underline;'>support immediately</a> to secure your account.</p>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Footer / Author Details -->
                                <tr>
                                    <td style='background-color: #f8fafc; padding: 40px; border-top: 1px solid #edf2f7;'>
                                        <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                                            <tr>
                                                <td>
                                                    <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                                                        <tr>
                                                            <td width='80' valign='top' style='padding-right: 20px;'>
                                                                <img src='https://avatars.githubusercontent.com/u/1?v=4' width='80' height='80' style='border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.1);' alt='Deepak Mandal'>
                                                            </td>
                                                            <td valign='top'>
                                                                <div style='font-size: 16px; font-weight: 700; color: #2d3748; margin-bottom: 4px;'>Deepak Mandal</div>
                                                                <div style='font-size: 12px; font-weight: 600; color: #1565C0; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;'>Full Stack Developer & System Architect</div>
                                                                <p style='margin: 0; font-size: 13px; line-height: 1.5; color: #718096;'>
                                                                    Passionate about building high-performance web applications and premium digital experiences. Specialist in React, Node.js, and Modern UI/UX.
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <div style='margin-top: 25px; margin-bottom: 25px;'>
                                                        <a href='https://deepakmandal.dev' style='display: inline-block; background-color: #1565C0; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; box-shadow: 0 4px 12px rgba(21, 101, 192, 0.2);'>Visit Official Website</a>
                                                    </div>

                                                    <div style='padding-top: 20px; border-top: 1px solid #e2e8f0;'>
                                                        <span style='font-size: 12px; color: #a0aec0; margin-right: 15px;'>Connect with me:</span>
                                                        <a href='#' style='text-decoration: none; margin-right: 12px;'><img src='https://cdn-icons-png.flaticon.com/32/145/145807.png' width='18' height='18' alt='LinkedIn'></a>
                                                        <a href='#' style='text-decoration: none; margin-right: 12px;'><img src='https://cdn-icons-png.flaticon.com/32/733/733553.png' width='18' height='18' alt='GitHub'></a>
                                                        <a href='#' style='text-decoration: none;'><img src='https://cdn-icons-png.flaticon.com/32/3256/3256013.png' width='18' height='18' alt='Twitter'></a>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style='padding-top: 40px; text-align: center;'>
                                                    <p style='font-size: 11px; color: #cbd5e0; margin: 0;'>© " . date('Y') . " Portfolio CMS. Handcrafted by Deepak Mandal.</p>
                                                    <p style='font-size: 10px; color: #cbd5e0; margin: 5px 0 0;'>This is an automated security email. Please do not reply.</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        ";
        sendMail($user['email'], $subject, $message);

        jsonResponse(['success' => true, 'message' => 'Password updated successfully. You can now login.']);
    }
}

errorResponse('Method or action not allowed', 405);
