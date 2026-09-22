# BOBA Bear PostgreSQL 18 + pgBackRest (IMP-037 Layer 1).
#
# Extends the official PostgreSQL 18 image with a reproducible, version-pinned
# pgBackRest build. Ubuntu 24.04 stock pgBackRest 2.50 is FORBIDDEN
# (locked floor >= 2.55).
#
# Also replaces upstream `gosu` with a rebuild against a pinned modern Go
# toolchain so Trivy gobinary stdlib findings on /usr/local/bin/gosu stay
# remediable (IMP-038 §15 image gate).
#
# Build:
#   docker build -f docker/postgres/Dockerfile -t boba-bear-postgres:local .
#
# Pin verification:
#   docker run --rm boba-bear-postgres:local pgbackrest version

ARG POSTGRES_BASE_IMAGE=docker.io/library/postgres:18.4-trixie
ARG GOSU_GO_IMAGE=docker.io/library/golang:1.26.8-bookworm
ARG GOSU_VERSION=1.19
# Immutable content pin for tianon/gosu@1.19 (do not resolve mutable tags at build).
ARG GOSU_GIT_SHA=6456aaa0f3c854d199d0f037f068eb97515b7513

# ── gosu rebuild (patched Go stdlib) ─────────────────────────────────────
FROM ${GOSU_GO_IMAGE} AS gosu-builder
ARG GOSU_VERSION
ARG GOSU_GIT_SHA
WORKDIR /src
RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && git clone --filter=blob:none https://github.com/tianon/gosu.git . \
  && git fetch --depth 1 origin "${GOSU_GIT_SHA}" \
  && git checkout --detach "${GOSU_GIT_SHA}" \
  && test "$(git rev-parse HEAD)" = "${GOSU_GIT_SHA}" \
  && CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.Version=${GOSU_VERSION}" -o /gosu .

FROM ${POSTGRES_BASE_IMAGE}

ARG PGBACKREST_VERSION=2.56.0
ARG GOSU_VERSION=1.19

LABEL org.opencontainers.image.title="boba-bear-postgres" \
      org.opencontainers.image.description="PostgreSQL 18 with pinned pgBackRest >= 2.55 for IMP-037" \
      boba.pgbackrest.version="${PGBACKREST_VERSION}" \
      boba.pgbackrest.min_version="2.55.0" \
      boba.gosu.version="${GOSU_VERSION}"

USER root

# Replace upstream gosu (Go 1.24.6 stdlib) with rebuild from gosu-builder.
COPY --from=gosu-builder /gosu /usr/local/bin/gosu
RUN chmod 0755 /usr/local/bin/gosu \
  && gosu nobody true \
  && gosu version 2>&1 | grep -F "gosu version: ${GOSU_VERSION}" \
  && gosu version 2>&1 | grep -F "go1.26"

# Apply available Debian security updates before installing build deps
# (IMP-038 §15 Trivy image gate; unfixed CVEs use --ignore-unfixed).
RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

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
