# Security Audit Report — Meteor Client Mod

**Audit Date:** 2026-03-03
**Repository:** `protoconal/build-meteor-client`
**Source:** Based on the [MeteorDevelopment/meteor-client](https://github.com/MeteorDevelopment/meteor-client) open-source project

---

## Summary

This audit examined the Meteor Client Minecraft mod for security vulnerabilities, malware, and malicious behavior. **No malware was found.** The codebase is consistent with the official open-source Meteor Client project. Several security concerns and vulnerabilities were identified and are documented below. Critical issues have been fixed as part of this audit.

---

## Malware Assessment: ✅ CLEAN

- **No obfuscated code** — All source files are readable, well-structured Java
- **No data exfiltration** — Tokens and credentials are NOT sent to remote servers
- **No hidden backdoors** — No covert network connections or command-and-control channels
- **No suspicious binary files** — Only the standard Gradle wrapper JAR is present
- **No Discord webhooks or paste-site uploads** used for data theft
- **All network URLs are legitimate** — connections go to `meteorclient.com`, Microsoft OAuth, Xbox Live, Minecraft services, GitHub API, and `laby.net`

---

## Vulnerabilities Found

### 🔴 HIGH: Swarm Module — Unauthenticated Remote Command Execution

**Status:** FIXED

**Location:** `src/main/java/meteordevelopment/meteorclient/systems/modules/misc/swarm/`

**Description:**
The Swarm module allows controlling multiple Meteor Client instances from a central host. The `SwarmHost` created a `ServerSocket` bound to **all network interfaces** (`0.0.0.0`), and the `SwarmWorker` accepted and executed arbitrary commands from the socket with **no authentication, authorization, or encryption**.

Any device on the same network could connect to the Swarm port and send commands that would be executed by connected worker instances via `Commands.dispatch()`.

**Fix Applied:**
The `ServerSocket` now binds to `InetAddress.getLoopbackAddress()` (localhost/`127.0.0.1` only), restricting connections to the local machine. This prevents network-wide command injection while preserving the intended local multi-instance functionality.

**Remaining Risk:** The Swarm protocol still lacks authentication and encryption. Users connecting workers to remote hosts (by changing the IP setting) should be aware that commands are transmitted in plaintext.

---

### 🟡 MEDIUM: Account Tokens Stored in Plaintext

**Status:** NOT FIXED (informational)

**Location:** `src/main/java/meteordevelopment/meteorclient/systems/accounts/`

**Description:**
All account types store authentication tokens in plaintext NBT files on disk (`~/.minecraft/meteor-client/accounts.nbt`):

- `SessionAccount` — stores Minecraft access tokens
- `MicrosoftAccount` — stores Microsoft OAuth refresh tokens (in the `name` field)
- `TheAlteningAccount` — stores Altening tokens

Any process or user with filesystem read access can extract these tokens. While this is a common pattern in Minecraft modding (and vanilla Minecraft itself stores session tokens similarly), it presents a risk if the machine is compromised.

**Recommendation:** Consider encrypting sensitive token data at rest using OS-level credential storage or a passphrase-derived key.

---

### 🟡 MEDIUM: Telemetry Without Explicit Opt-In

**Status:** NOT FIXED (informational)

**Location:** `src/main/java/meteordevelopment/meteorclient/utils/network/OnlinePlayers.java`

**Description:**
The `OnlinePlayers` class automatically sends HTTP POST requests to `https://meteorclient.com/api/online/ping` every 5 minutes while the client is running, and sends a `leave` notification on shutdown. While no personal data is included in the request body, the user's IP address is inherently transmitted.

There is no visible opt-out mechanism for this telemetry.

**Recommendation:** Add a configuration option to disable online player tracking.

---

### 🟢 LOW: HTTP User-Agent Spoofing

**Status:** NOT FIXED (informational)

**Location:** `src/main/java/meteordevelopment/meteorclient/utils/network/Http.java` (line 53)

**Description:**
The HTTP client uses a spoofed Chrome User-Agent string: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36`. While not a security vulnerability, this is a deceptive practice that could interfere with server-side analytics.

---

## CI/CD Findings

### 🟡 MEDIUM: Missing Build Date Step in `build_publish.yml`

**Status:** FIXED

**Description:**
The `build_publish.yml` workflow referenced `${{ steps.prep.outputs.build_date }}` in the release body, but no step with `id: prep` existed in the workflow. This caused the build date field in GitHub Releases to be empty.

**Fix Applied:** Added the missing `prep` step to capture the build date, matching the pattern already used in `build_specific_commit.yml`.

---

### 🟢 LOW: GitHub Actions Use Version Tags Instead of Commit SHAs

**Status:** NOT FIXED (informational)

**Description:**
Third-party GitHub Actions (`actions/checkout@v4`, `gradle/actions/setup-gradle@v4`, `softprops/action-gh-release@v2`, etc.) are referenced by version tags rather than pinned commit SHAs. If a tag were compromised (tag-jacking attack), malicious code could be injected into the CI pipeline.

**Recommendation:** Pin third-party actions to specific commit SHAs for supply chain security.

---

## Dependency Review

| Dependency | Version | Status |
|---|---|---|
| Fabric Loader | 0.18.2 | ✅ Standard Fabric dependency |
| Fabric API | 0.140.0+1.21.11 | ✅ Standard Fabric dependency |
| Netty | 4.2.7.Final | ✅ Well-known networking library |
| Reflections | 0.10.2 | ✅ Standard reflection utility |
| Orbit (Event Bus) | 0.2.4 | ✅ Meteor's own event bus library |
| Starscript | 0.2.5 | ✅ Meteor's own scripting library |
| Discord IPC | 1.1 | ✅ Meteor's own Discord RPC library |
| WaybackAuthLib | 1.0.1 | ✅ Authentication library by FlorianMichael |
| Gradle Wrapper | 9.2.0 | ✅ Downloaded from official Gradle services |

All dependencies are sourced from recognized Maven repositories (Maven Central, Fabric Maven, Meteor Maven, Modrinth, Terraformers, ViaVersion).

---

## Code Patterns Reviewed

| Category | Finding |
|---|---|
| `Runtime.exec()` | Used only in launcher `Main.java` to open URLs/folders via OS-native commands (`xdg-open`, `open`, `rundll32`). No arbitrary command execution. |
| `Class.forName()` / Reflection | Used for Baritone path manager loading and mixin setup. Standard Fabric mod patterns. |
| ASM Bytecode Transformation | Single transformer (`PacketInflaterTransformer`) modifies Minecraft's packet size limit check. Well-documented purpose (Anti-Packet-Kick). |
| File I/O | Writes only to the mod's own config directory (`~/.minecraft/meteor-client/`). No access to sensitive system files. |
| Network Sockets | Used in Swarm module (now localhost-only) and Proxy status checking (user-configured addresses only). |
| Microsoft OAuth | Standard OAuth2 flow using Microsoft's official endpoints. Local callback server bound to `127.0.0.1`. |

---

## Conclusion

This mod is **not malware**. It is a legitimate (if controversial) Minecraft utility client. The code is well-structured, open-source, and contains no hidden malicious functionality. Two security vulnerabilities were fixed as part of this audit (Swarm network binding and CI build date). Remaining informational findings are documented above for awareness.
