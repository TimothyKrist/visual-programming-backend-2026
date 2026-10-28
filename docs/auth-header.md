# Authorization header parsing

The authentication middleware in `src/middleware/auth.ts` reads the header with `req.get('Authorization')`. Express returns the whole header value, such as `Bearer abc123`, or `undefined` if the header is missing. It does not extract the bearer token.

The middleware uses this expression to check the header format and capture the token:

```ts
/^Bearer (\S+)$/i
```

| Part | Meaning |
| --- | --- |
| `/.../` | Delimits the regular expression in JavaScript. |
| `^` | Requires the match to start at the beginning of the header. |
| `Bearer` | Matches the authentication scheme. |
| space | Requires one literal space after the scheme. |
| `(...)` | Captures the matched token so it can be retrieved as `match[1]`. |
| `\S` | Matches a character that is not whitespace. |
| `+` | Requires one or more non-whitespace characters. |
| `$` | Requires the match to reach the end of the header. |
| `i` | Makes the match case-insensitive, so `bearer` also works. |

For `Bearer abc123`, the captured token is `abc123`. `Basic abc123` is rejected because the scheme is wrong, and `Bearer abc 123` is rejected because the token contains whitespace.

Splitting the header on a space and taking the second element alone would not check the scheme or reject extra text. The regex checks the format; it does not prove the token is valid. The middleware passes the captured token to `jwt.verify` for verification.
