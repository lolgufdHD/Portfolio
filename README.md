## Docker installation

Create a Stack in Portainer and paste the following code:

```yaml
services:
  portfolio:
    image: lolgufdhd/portfolio:latest
    container_name: portfolio
    ports:
      - "4000:3000"
    restart: unless-stopped
    environment:
      - ADMIN_PASSWORD=changeme
```
