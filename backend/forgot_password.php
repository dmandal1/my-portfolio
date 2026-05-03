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
            <body style='margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f9fafb; padding: 40px 0;'>
                    <tr>
                        <td align='center'>
                            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);'>
                                <!-- Blue Header -->
                                <tr>
                                    <td style='background: #2563eb; padding: 40px 20px; text-align: center;'>
                                        <img src='https://cdn-icons-png.flaticon.com/64/564/564619.png' width='40' height='40' style='filter: invert(1); margin-bottom: 16px;'>
                                        <h1 style='color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;'>Security Verification</h1>
                                        <p style='color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px; font-weight: 500;'>Administrative Access Requested</p>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style='padding: 40px;'>
                                        <p style='margin: 0 0 20px; font-size: 18px; color: #1e3a8a; font-weight: 700;'>Hello Admin 👋</p>
                                        <p style='margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #4b5563;'>
                                            A request has been made to access your administrative dashboard. Please use the verification details provided below to continue.
                                        </p>
                                        
                                        <!-- Verification Card -->
                                        <div style='background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;'>
                                            <div style='font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;'>VERIFICATION CODE</div>
                                            <div style='font-size: 36px; font-weight: 800; color: #2563eb; letter-spacing: 12px; margin-bottom: 24px; font-family: monospace;'>{$otp}</div>
                                            
                                            <div style='font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;'>EXPIRATION</div>
                                            <div style='font-size: 14px; color: #1f2937; font-weight: 600;'>Within 10 minutes</div>
                                        </div>

                                        <!-- Context Card -->
                                        <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 32px;'>
                                            <div style='font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;'>SECURITY CONTEXT</div>
                                            <p style='margin: 0 0 8px; font-size: 14px; color: #4b5563;'><strong>Platform:</strong> {$device}</p>
                                            <p style='margin: 0; font-size: 14px; color: #4b5563;'><strong>Network IP:</strong> {$ipAddress}</p>
                                        </div>

                                        <!-- About Section -->
                                        <div style='font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;'>ABOUT ME</div>
                                        <div style='background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 32px;'>
                                            <table width='100%'>
                                                <tr>
                                                    <td width='64' valign='top'>
                                                        <img src='https://raw.githubusercontent.com/dmandal1/my-portfolio/main/src/assests/images/deepak_mandal.jpeg' width='64' height='64' style='border-radius: 50%; border: 2px solid #f1f5f9; object-fit: cover;'>
                                                    </td>
                                                    <td style='padding-left: 20px;' valign='top'>
                                                        <div style='font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 2px;'>Deepak Mandal</div>
                                                        <div style='font-size: 13px; color: #6b7280; margin-bottom: 8px;'>Associate Consultant • Infosys</div>
                                                        <div style='font-size: 13px; color: #4b5563; line-height: 1.5;'>4+ years experience in backend development & scalable systems (Node.js)</div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        <div style='text-align: center;'>
                                            <a href='https://deepakmandal.dev' style='display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 700; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);'>Visit My Portfolio →</a>
                                            <p style='margin-top: 24px; font-size: 13px; color: #6b7280;'>If you did not request this, contact <a href='mailto:me@deepakmandal.dev' style='color: #2563eb; text-decoration: underline;'>me@deepakmandal.dev</a></p>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style='background: #f9fafb; padding: 48px 40px; border-top: 1px solid #e5e7eb; text-align: center;'>
                                        <div style='font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px;'>Deepak Mandal</div>
                                        <div style='font-size: 12px; color: #6b7280; margin-bottom: 16px;'>Backend Developer • Node.js • Building Scalable Systems</div>
                                        
                                        <div style='font-size: 13px; margin-bottom: 24px;'>
                                            <a href='https://deepakmandal.dev' style='color: #2563eb; text-decoration: none;'>Portfolio</a> • 
                                            <a href='mailto:me@deepakmandal.dev' style='color: #2563eb; text-decoration: none;'>Email</a> • 
                                            <a href='https://www.linkedin.com/in/dmandal1/' style='color: #2563eb; text-decoration: none;'>LinkedIn</a> • 
                                            <a href='https://github.com/dmandal1' style='color: #2563eb; text-decoration: none;'>GitHub</a>
                                        </div>
                                        
                                        <div style='font-size: 11px; color: #94a3b8;'>
                                            📍 India • 📧 <a href='mailto:me@deepakmandal.dev' style='color: #94a3b8; text-decoration: none;'>me@deepakmandal.dev</a>
                                            <div style='margin-top: 8px;'>Notification from your portfolio contact form.</div>
                                            <div style='margin-top: 4px;'>&copy; " . date('Y') . " Deepak Mandal. All rights reserved.</div>
                                        </div>
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
            <body style='margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f9fafb; padding: 40px 0;'>
                    <tr>
                        <td align='center'>
                            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);'>
                                <!-- Blue Header -->
                                <tr>
                                    <td style='background: #059669; padding: 40px 20px; text-align: center;'>
                                        <img src='https://cdn-icons-png.flaticon.com/64/190/190411.png' width='40' height='40' style='filter: invert(1); margin-bottom: 16px;'>
                                        <h1 style='color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;'>Security Confirmation</h1>
                                        <p style='color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px; font-weight: 500;'>Administrative Password Updated</p>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style='padding: 40px;'>
                                        <p style='margin: 0 0 20px; font-size: 18px; color: #065f46; font-weight: 700;'>Hello Admin 👋</p>
                                        <p style='margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #4b5563;'>
                                            This is a confirmation that your administrative password has been successfully changed. No further action is required if this was you.
                                        </p>
                                        
                                        <!-- Summary Card -->
                                        <div style='background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;'>
                                            <div style='font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;'>ACTIVITY SUMMARY</div>
                                            
                                            <div style='font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;'>STATUS</div>
                                            <div style='font-size: 14px; color: #059669; font-weight: 700; margin-bottom: 16px;'>
                                                <span style='display: inline-block; width: 8px; height: 8px; background: #059669; border-radius: 50%; margin-right: 6px;'></span>
                                                Password Updated Successfully
                                            </div>
                                            
                                            <div style='font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;'>TIMESTAMP</div>
                                            <div style='font-size: 14px; color: #1f2937; font-weight: 600;'>" . date('Y-m-d H:i:s T') . "</div>
                                        </div>

                                        <!-- Context Card -->
                                        <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 32px;'>
                                            <div style='font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;'>SECURITY CONTEXT</div>
                                            <p style='margin: 0 0 8px; font-size: 14px; color: #4b5563;'><strong>Platform:</strong> {$device}</p>
                                            <p style='margin: 0; font-size: 14px; color: #4b5563;'><strong>Network IP:</strong> {$ipAddress}</p>
                                        </div>

                                        <!-- About Section -->
                                        <div style='font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;'>ABOUT ME</div>
                                        <div style='background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 32px;'>
                                            <table width='100%'>
                                                <tr>
                                                    <td width='64' valign='top'>
                                                        <img src='https://raw.githubusercontent.com/dmandal1/my-portfolio/main/src/assests/images/deepak_mandal.jpeg' width='64' height='64' style='border-radius: 50%; border: 2px solid #f1f5f9; object-fit: cover;'>
                                                    </td>
                                                    <td style='padding-left: 20px;' valign='top'>
                                                        <div style='font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 2px;'>Deepak Mandal</div>
                                                        <div style='font-size: 13px; color: #6b7280; margin-bottom: 8px;'>Associate Consultant • Infosys</div>
                                                        <div style='font-size: 13px; color: #4b5563; line-height: 1.5;'>4+ years experience in backend development & scalable systems (Node.js)</div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        <div style='text-align: center;'>
                                            <a href='https://deepakmandal.dev' style='display: inline-block; background: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 700; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);'>Visit My Portfolio →</a>
                                            <p style='margin-top: 24px; font-size: 13px; color: #6b7280;'>If you did not request this, contact <a href='mailto:me@deepakmandal.dev' style='color: #059669; text-decoration: underline;'>me@deepakmandal.dev</a></p>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style='background: #f9fafb; padding: 48px 40px; border-top: 1px solid #e5e7eb; text-align: center;'>
                                        <div style='font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px;'>Deepak Mandal</div>
                                        <div style='font-size: 12px; color: #6b7280; margin-bottom: 16px;'>Backend Developer • Node.js • Building Scalable Systems</div>
                                        
                                        <div style='font-size: 13px; margin-bottom: 24px;'>
                                            <a href='https://deepakmandal.dev' style='color: #2563eb; text-decoration: none;'>Portfolio</a> • 
                                            <a href='mailto:me@deepakmandal.dev' style='color: #2563eb; text-decoration: none;'>Email</a> • 
                                            <a href='https://www.linkedin.com/in/dmandal1/' style='color: #2563eb; text-decoration: none;'>LinkedIn</a> • 
                                            <a href='https://github.com/dmandal1' style='color: #2563eb; text-decoration: none;'>GitHub</a>
                                        </div>
                                        
                                        <div style='font-size: 11px; color: #94a3b8;'>
                                            📍 India • 📧 <a href='mailto:me@deepakmandal.dev' style='color: #94a3b8; text-decoration: none;'>me@deepakmandal.dev</a>
                                            <div style='margin-top: 8px;'>Notification from your portfolio contact form.</div>
                                            <div style='margin-top: 4px;'>&copy; " . date('Y') . " Deepak Mandal. All rights reserved.</div>
                                        </div>
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
