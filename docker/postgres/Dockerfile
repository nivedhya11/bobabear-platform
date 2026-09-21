# BOBA Bear PostgreSQL 18 + pgBackRest (IMP-037 Layer 1).
#
# Extends the official PostgreSQL 18 image with a reproducible, version-pinned
# pgBackRest build. Ubuntu 24.04 stock pgBackRest 2.50 is FORBIDDEN
# (locked floor >= 2.55).
#
# Build:
#   docker build -f docker/postgres/Dockerfile -t boba-bear-postgres:local .
#
# Pin verification:
#   docker run --rm boba-bear-postgres:local pgbackrest version

ARG POSTGRES_BASE_IMAGE=docker.io/library/postgres:18.4-trixie
FROM ${POSTGRES_BASE_IMAGE}

ARG PGBACKREST_VERSION=2.56.0

LABEL org.opencontainers.image.title="boba-bear-postgres" \
      org.opencontainers.image.description="PostgreSQL 18 with pinned pgBackRest >= 2.55 for IMP-037" \
      boba.pgbackrest.version="${PGBACKREST_VERSION}" \
      boba.pgbackrest.min_version="2.55.0"

USER root

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      build-essential \
      libssl-dev \
      libxml2-dev \
      liblz4-dev \
      libzstd-dev \
      libbz2-dev \
      libyaml-dev \
      libssh2-1-dev \
      libpq-dev \
      pkg-config \
      meson \
      ninja-build \
      curl \
      ca-certificates \
      python3; \
    curl -fsSL --retry 3 \
      "https://github.com/pgbackrest/pgbackrest/archive/refs/tags/release/${PGBACKREST_VERSION}.tar.gz" \
      -o /tmp/pgbackrest.tar.gz; \
    # Refuse empty/partial downloads early.
    test -s /tmp/pgbackrest.tar.gz; \
    mkdir -p /tmp/pgbackrest-src; \
    tar -xzf /tmp/pgbackrest.tar.gz -C /tmp/pgbackrest-src --strip-components=1; \
    meson setup /tmp/pgbackrest-build /tmp/pgbackrest-src; \
    ninja -C /tmp/pgbackrest-build; \
    ninja -C /tmp/pgbackrest-build install; \
    pgbackrest version; \
    installed="$(pgbackrest version | head -n1 | sed -n 's/.* \([0-9][0-9.]*\).*/\1/p')"; \
    python3 -c "import sys; \
v=tuple(int(x) for x in sys.argv[1].split('.')); \
assert v >= (2,55,0), f'pgBackRest {sys.argv[1]} below locked floor 2.55.0'; \
print(f'pgBackRest pin OK: {sys.argv[1]}')" "$installed"; \
    apt-get purge -y --auto-remove \
      build-essential meson ninja-build pkg-config \
      libssl-dev libxml2-dev liblz4-dev libzstd-dev libbz2-dev libyaml-dev libssh2-1-dev libpq-dev; \
    apt-get install -y --no-install-recommends \
      libssl3 \
      libxml2 \
      liblz4-1 \
      libzstd1 \
      libbz2-1.0 \
      libyaml-0-2 \
      libssh2-1 \
      age; \
    rm -rf /tmp/pgbackrest.tar.gz /tmp/pgbackrest-src /tmp/pgbackrest-build /var/lib/apt/lists/*

RUN mkdir -p /etc/pgbackrest /var/lib/pgbackrest /var/log/pgbackrest /var/spool/pgbackrest \
    && chown -R postgres:postgres /etc/pgbackrest /var/lib/pgbackrest /var/log/pgbackrest /var/spool/pgbackrest \
    && chmod 750 /etc/pgbackrest /var/lib/pgbackrest /var/log/pgbackrest /var/spool/pgbackrest

COPY docker/postgres/pgbackrest/pgbackrest.conf.template /etc/pgbackrest/pgbackrest.conf.template
COPY docker/postgres/pgbackrest/render-conf.sh /usr/local/bin/boba-render-pgbackrest-conf
COPY docker/postgres/pgbackrest/entrypoint-wrapper.sh /usr/local/bin/boba-postgres-entrypoint
RUN chmod 755 /usr/local/bin/boba-render-pgbackrest-conf /usr/local/bin/boba-postgres-entrypoint

ENTRYPOINT ["boba-postgres-entrypoint"]
CMD ["postgres"]
