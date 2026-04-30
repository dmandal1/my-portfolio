<?php
function jwtBase64Encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function jwtBase64Decode(string $data): string {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

function createJwt(array $payload): string {
    $header  = jwtBase64Encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = jwtBase64Encode(json_encode($payload));
    $sig     = jwtBase64Encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$sig";
}

function verifyJwt(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $sig] = $parts;

    $expected = jwtBase64Encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;

    $data = json_decode(jwtBase64Decode($payload), true);
    if (!is_array($data)) return null;
    if (isset($data['exp']) && $data['exp'] < time()) return null;

    return $data;
}

function requireAuth(): array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($authHeader, 'Bearer ')) {
        errorResponse('Unauthorized', 401);
    }
    $token   = substr($authHeader, 7);
    $payload = verifyJwt($token);
    if (!$payload) {
        errorResponse('Invalid or expired token', 401);
    }
    return $payload;
}
