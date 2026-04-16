import json

with open("artifacts/api-server/package.json", "r") as f:
    pkg = json.load(f)

# Fix 1: Move @types/paypal-rest-sdk to devDependencies
if "dependencies" in pkg and "@types/paypal-rest-sdk" in pkg["dependencies"]:
    ver = pkg["dependencies"].pop("@types/paypal-rest-sdk")
    pkg.setdefault("devDependencies", {})["@types/paypal-rest-sdk"] = ver

# Fix 2: Restore Azure packages
pkg.setdefault("dependencies", {})["@azure/ai-projects"] = "^1.0.0-beta.3"
pkg["dependencies"]["@azure/identity"] = "^4.2.1"

with open("artifacts/api-server/package.json", "w") as f:
    json.dump(pkg, f, indent=2)
