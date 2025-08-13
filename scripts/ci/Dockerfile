# Use the official Cypress image with Cypress v13 pre-installed.
# This saves time by not needing to download Cypress during the build.
FROM docker.io/cypress/included:13.13.0

# Define ARGs for tool versions for clarity
ARG OCP_CLI=https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux.tar.gz
ARG OCM_CLI=https://github.com/openshift-online/ocm-cli/releases/download/v1.0.7/ocm-linux-amd64
ARG YQ_VERSION=v4.44.2

# Switch to root user to install additional pipeline tools
USER root

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
    && rm -rf /var/lib/apt/lists/*

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

# Create the home directory for the cypress user
RUN mkdir -p /home/cypress

# Give group write permissions for OpenShift/Jenkins compatibility
RUN chmod -R g+w /home/cypress

# Set the working directory for the application
WORKDIR /e2e

# Copy application code into the container
COPY . .

# Install project dependencies (excluding Cypress, which is already in the image)
# The --network-timeout flag helps prevent failures on slow networks.
RUN npm ci --network-timeout 600000

# Set ownership of the project directory to the cypress user (UID 1000)
# This is the default non-root user in the cypress base images.
RUN chown -R 1000:1000 /e2e

# Create a writable font cache directory for the non-root user
USER root
RUN mkdir -p /home/cypress/.cache/fontconfig && \
    chown -R 1000:1000 /home/cypress/.cache

# Switch to the non-root cypress user
USER 1000
ENV FONTCONFIG_PATH=/etc/fonts
ENV FONTCONFIG_CACHE_DIR=/home/cypress/.cache/fontconfig

# Set environment variable for global git config to be in a writable location
ENV GIT_CONFIG_GLOBAL=/home/cypress/.gitconfig

# Set environment variable for kubeconfig to be in a writable location
ENV KUBECONFIG=/home/cypress/.kube/config

# Label the Image for identification
LABEL io.opendatahub.component="odh-cypress" \
      io.k8s.display-name="odh-cypress" \
      name="open-data-hub/odh-cypress" \
      summary="odh-cypress" \
      description="Image for Running Cypress Tests for Open Data Hub Dashboard"
