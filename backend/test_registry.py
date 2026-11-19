from app.core import registry

registry.create_system("acme", "Acme Corp")
registry.create_system("globex", "Globex Ltd", subdomain="globex-ai")

registry.start_system("acme")

for s in registry.list_systems():
    print(s["id"], "|", s["subdomain"], "|", s["status"])

print(registry.find_by_subdomain("globex-ai")["name"])
