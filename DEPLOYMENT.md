# 🚀 Guide de Déploiement sur Railway

## Configuration du projet
Votre projet est maintenant configuré pour Railway avec :
- ✅ `railway.json` - Configuration Railway
- ✅ `Procfile` - Instructions de démarrage
- ✅ `package.json` - Scripts de build automatiques
- ✅ Compilation TypeScript configurée

## 📦 Méthode 1 : Déploiement avec Railway CLI (RECOMMANDÉ)

### 1. Installer Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Se connecter à Railway
```bash
railway login
```
Cela ouvrira votre navigateur pour vous authentifier.

### 3. Créer un nouveau projet Railway
```bash
cd "/Users/paul-antoinesage/Desktop/Sales Agent"
railway init
```
Suivez les instructions pour créer un nouveau projet.

### 4. Ajouter les variables d'environnement
```bash
railway variables set MCP_HTTP_PORT=3000
railway variables set FATHOM_API_KEY=votre_clé_api_fathom
```

**⚠️ IMPORTANT:** Remplacez `votre_clé_api_fathom` par votre vraie clé API Fathom !

### 5. Déployer !
```bash
railway up
```

### 6. Obtenir l'URL publique
```bash
railway domain
```
Si aucun domaine n'est configuré, créez-en un :
```bash
railway domain generate
```

---

## 🔗 Méthode 2 : Déploiement via GitHub

### 1. Authentifier GitHub avec gh CLI
```bash
brew install gh
gh auth login
```

Ou configurez SSH :
```bash
ssh-keygen -t ed25519 -C "votre_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Ajoutez cette clé sur https://github.com/settings/keys
git remote set-url origin git@github.com:paul-antoine-presti-ai/sales-agent-mcp.git
```

### 2. Pousser sur GitHub
```bash
git push -u origin main
```

### 3. Connecter Railway à GitHub
1. Allez sur https://railway.app
2. Cliquez sur "New Project"
3. Sélectionnez "Deploy from GitHub repo"
4. Choisissez `paul-antoine-presti-ai/sales-agent-mcp`
5. Railway détectera automatiquement la configuration

### 4. Configurer les variables d'environnement
Dans le dashboard Railway :
- `MCP_HTTP_PORT` = `3000`
- `FATHOM_API_KEY` = votre clé API Fathom

---

## 🔍 Vérification du déploiement

Une fois déployé, testez votre endpoint MCP :

```bash
# Récupérer l'URL de votre service
railway domain

# Tester l'endpoint (remplacez YOUR_URL par l'URL obtenue)
curl -X POST https://YOUR_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
```

Vous devriez voir la liste des outils disponibles :
- `greet`
- `get_fathom_transcript`
- `get_fathom_calls`

---

## 📊 Commandes utiles Railway

```bash
# Voir les logs en temps réel
railway logs

# Ouvrir le dashboard web
railway open

# Voir les variables d'environnement
railway variables

# Redéployer
railway up

# Voir le statut
railway status
```

---

## ⚠️ Important : Variables d'environnement

Votre application nécessite :
- **MCP_HTTP_PORT** : Port d'écoute (Railway assignera automatiquement le port via la variable PORT, mais vous pouvez garder 3000 en défaut)
- **FATHOM_API_KEY** : Votre clé API Fathom (obligatoire !)

Sans ces variables, le serveur ne démarrera pas.

---

## 🎯 URL de votre MCP

Une fois déployé, votre serveur MCP sera accessible à :
```
https://votre-app.railway.app/mcp
```

Vous pourrez l'utiliser dans Claude Desktop ou tout autre client MCP en configurant l'URL HTTP.

