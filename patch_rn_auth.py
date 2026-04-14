with open('artifacts/klonos/components/AuthModal.tsx', 'r') as f:
    content = f.read()

new_content = content.replace('''                  onPress={() => {
                    const base = getApiBase();
                    if (typeof window !== "undefined") {
                      window.location.href = `${base}/sign-in/social?provider=google`;
                    } else {
                      setError("Google login no soportado en este entorno nativo de prueba.");
                    }
                  }}''', '''                  onPress={() => {
                    const base = getApiBase();
                    if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
                      window.location.href = `${base}/sign-in/social?provider=google`;
                    } else {
                      setError("Google login no soportado en este entorno nativo de prueba.");
                    }
                  }}''').replace('''                  onPress={() => {
                    const base = getApiBase();
                    if (typeof window !== "undefined") {
                      window.location.href = `${base}/sign-in/social?provider=microsoft`;
                    } else {
                      setError("Microsoft login no soportado en este entorno nativo de prueba.");
                    }
                  }}''', '''                  onPress={() => {
                    const base = getApiBase();
                    if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
                      window.location.href = `${base}/sign-in/social?provider=microsoft`;
                    } else {
                      setError("Microsoft login no soportado en este entorno nativo de prueba.");
                    }
                  }}''').replace('''                  onPress={() => {
                    const base = getApiBase();
                    if (typeof window !== "undefined") {
                      window.location.href = `${base}/sign-in/social?provider=github`;
                    } else {
                      setError("GitHub login no soportado en este entorno nativo de prueba.");
                    }
                  }}''', '''                  onPress={() => {
                    const base = getApiBase();
                    if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
                      window.location.href = `${base}/sign-in/social?provider=github`;
                    } else {
                      setError("GitHub login no soportado en este entorno nativo de prueba.");
                    }
                  }}''')

with open('artifacts/klonos/components/AuthModal.tsx', 'w') as f:
    f.write(new_content)
