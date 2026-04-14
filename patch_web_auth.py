with open('artifacts/clonengine/src/components/BiometricLoginModal.tsx', 'r') as f:
    content = f.read()

new_content = content.replace(
'''onClick={() => window.location.href = '/api/auth/sign-in/social?provider=google'}''',
'''onClick={() => window.location.href = `${getApiBase()}/sign-in/social?provider=google`}'''
).replace(
'''onClick={() => window.location.href = '/api/auth/sign-in/social?provider=microsoft'}''',
'''onClick={() => window.location.href = `${getApiBase()}/sign-in/social?provider=microsoft`}'''
).replace(
'''onClick={() => window.location.href = '/api/auth/sign-in/social?provider=github'}''',
'''onClick={() => window.location.href = `${getApiBase()}/sign-in/social?provider=github`}'''
)

with open('artifacts/clonengine/src/components/BiometricLoginModal.tsx', 'w') as f:
    f.write(new_content)
