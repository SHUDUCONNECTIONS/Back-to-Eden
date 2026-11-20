#!/bin/sh
# Starts the app as the unprivileged "node" user.
#
# A freshly attached volume (Railway, Docker) is usually owned by root, which
# the node user cannot write to. So the container starts as root only long
# enough to hand /app/data to node, then drops privileges for the app itself.
set -e

DATA_DIR=/app/data
mkdir -p "$DATA_DIR"

if [ "$(id -u)" = "0" ]; then
  # Only touch files that are not already node's, so restarts stay fast.
  find "$DATA_DIR" \( ! -user node -o ! -group node \) -exec chown node:node {} +
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
