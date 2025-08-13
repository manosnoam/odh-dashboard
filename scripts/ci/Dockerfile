# Use the official Cypress image with Cypress v13 pre-installed.
# This saves time by not needing to download Cypress during the build.
FROM docker.io/cypress/included:13.13.0

# Define ARGs for tool versions and home directory for clarity
ARG USER=cypress
ARG USER_HOME=/home/$USER
ARG PYTHON_VERSION=3.11.11
ARG OCP_CLI=https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux.tar.gz
ARG OCM_CLI=https://github.com/openshift-online/ocm-cli/releases/download/v1.0.7/ocm-linux-amd64
ARG YQ_VERSION=v4.44.2

# Switch to root user
USER root

# Ensure the home directory exists and has the correct permissions
RUN mkdir -p "$USER_HOME" && \
    chown -R 1000:0 "$USER_HOME" && \
    chmod -R g+w "$USER_HOME"

# Install system-level dependencies for other tools.
# The Cypress base image is Debian, so we use apt-get.
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    unzip \
    xz-utils \
    jq \
    git \
    krb5-user \
    python3-pip \
    python3-dev \
    curl \
    openssl \
    gcc \
    g++ \
    make \
    libcap2-bin \
    skopeo \
    util-linux \
    && rm -rf /var/lib/apt/lists/*

# Install a newer Python version from source to satisfy project requirements (>=3.11.5)
RUN BUILD_DEPS="build-essential zlib1g-dev libncurses5-dev libgdbm-dev \
    libnss3-dev libssl-dev libreadline-dev libffi-dev \
    libsqlite3-dev libbz2-dev" && \
    apt-get update && apt-get install -y --no-install-recommends $BUILD_DEPS wget && \
    wget "https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tgz" && \
    tar -xvf "Python-${PYTHON_VERSION}.tgz" && \
    cd "Python-${PYTHON_VERSION}" && \
    ./configure --enable-optimizations --with-ensurepip=install && \
    make -j "$(nproc)" && \
    make altinstall && \
    cd .. && \
    rm -rf "Python-${PYTHON_VERSION}" "Python-${PYTHON_VERSION}.tgz" && \
    apt-get purge -y --auto-remove $BUILD_DEPS && \
    rm -rf /var/lib/apt/lists/*

# Force the system's python3 to point to our newly compiled version
RUN ln -sfn /usr/local/bin/python${PYTHON_VERSION%.*} /usr/bin/python3

# Install yq
RUN wget "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64" -O /usr/bin/yq && \
    chmod +x /usr/bin/yq

# Install OCP client (oc)
RUN wget -qO- "$OCP_CLI" | tar zxv -C /usr/local/bin/ oc kubectl

# Install OCM CLI (ocm)
RUN curl -Lo /usr/local/bin/ocm "$OCM_CLI" && \
    chmod +x /usr/local/bin/ocm

# Install Python tools, allowing system packages modification
RUN pip3 install --break-system-packages poetry distro

# Set capability to adjust OOM score for Node
RUN echo CAP_SYS_NICE >> /etc/security/limits.conf

# Set the working directory to the user's home, copy code, and set ownership
WORKDIR $USER_HOME
COPY . .
RUN chown -R 1000:0 .

# Switch to the user and export common env variables
USER 1000
ENV USER $USER
ENV HOME $USER_HOME
ENV GIT_CONFIG_GLOBAL=$USER_HOME/.gitconfig
ENV KUBECONFIG=$USER_HOME/.kube/config

RUN npm ci --network-timeout 600000

# Label the Image for identification
LABEL io.opendatahub.component="odh-cypress" \
      io.k8s.display-name="odh-cypress" \
      name="open-data-hub/odh-cypress" \
      summary="odh-cypress" \
      description="Image for Running Cypress Tests for Open Data Hub Dashboard"
