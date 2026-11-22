# Prévisualiser l'interface sur téléphone ou ordinateur

L'interface est un prototype Web local autonome. Depuis la racine du dépôt :

```bash
python3 -m http.server 8080 --directory app
```

Ouvrir `http://localhost:8080` depuis le même appareil. Pour la tester sur un téléphone connecté au même réseau local, remplacer `localhost` par l'adresse locale de l'ordinateur qui sert les fichiers.

Le service worker et l'installation PWA nécessitent un contexte sécurisé (`https://` ou `localhost`). Une fois la PWA servie via HTTPS et installée, les fichiers statiques de l'étape 2 sont mis en cache. Cette page de prévisualisation n'active aucun serveur de simulation et ne peut pas encore exécuter un fichier BIN.
