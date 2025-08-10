FROM quay.io/fedora/fedora:42

ARG USER=cypress
ARG USER_HOME=/home/$USER
ARG NPM_CACHE=/opt/app-root/src/.npm-global
ARG CYPRESS_CACHE=$USER_HOME/.cypress-cache
ARG CHROME=https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
ARG OCP_CLI=https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux.tar.gz
ARG NVM_INSTALLER=https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh
ARG NODE_VERSION=v20.18.0
ARG OCM_CLI=https://github.com/openshift-online/ocm-cli/releases/download/v1.0.7/ocm-linux-amd64

USER root

# Add local user to avoid permissions issues during job execution
RUN mkdir -p "$USER_HOME"
RUN useradd -m -g root "$USER" -d "$USER_HOME" --uid 1000
RUN chgrp -R 0 "$USER_HOME"
RUN chmod -R g=u "$USER_HOME"

# Create global NPM cache directory
RUN mkdir -p "$NPM_CACHE"
RUN chgrp -R 0 "$NPM_CACHE"
RUN chmod -R 777 "$NPM_CACHE"

# Create local Cypress cache directory
RUN mkdir -p "$CYPRESS_CACHE"
RUN chgrp -R 0 "$CYPRESS_CACHE"
RUN chmod -R 777 "$CYPRESS_CACHE"

# Install tools including Xvfb, Chrome, and additional required packages
RUN dnf update -y
RUN dnf install --nodocs -y \
    wget \
    unzip \
    xz \
    jq \
    git \
    xorg-x11-server-Xvfb \
    krb5-workstation \
    python3-pip \
    curl \
    openssl \
    "$CHROME"

# Install OCP client
RUN wget -qO- "$OCP_CLI" | tar zxv -C /usr/local/bin/ oc kubectl

# Install OCM CLI
RUN curl -Lo /usr/local/bin/ocm "$OCM_CLI" && \
    chmod +x /usr/local/bin/ocm

# Install Python Poetry
RUN pip3 install poetry

# Clean system cache
RUN dnf clean all
RUN rm -rf /var/cache/yum

# Set capability to adjust OOM score for Node
RUN echo CAP_SYS_NICE >> /etc/security/limits.conf

# Copy NodeJS packages lists (json files) from "frontend" directory
WORKDIR $USER_HOME
COPY ./frontend/package*.json ./
RUN chown $USER:0 ./*

# Switch to the user, export env variables, and prepare NVM directories
USER $USER
ENV USER $USER
ENV HOME $USER_HOME
ENV NVM_DIR $USER_HOME/nvm
ENV NODE_PATH "$NVM_DIR/versions/node/$NODE_VERSION/lib/node_modules"
ENV PATH "$NVM_DIR/versions/node/$NODE_VERSION/bin:/bin:$HOME/.local/bin:/root/.local/bin:/usr/local/bin:$NPM_CACHE/bin:$PATH"
RUN mkdir -p $NVM_DIR

# Install Node Version Manager, NodeJS and the packages for CI (package-lock.json)
RUN curl -o- $NVM_INSTALLER | bash
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use --delete-prefix $NODE_VERSION && \
    echo 'export PATH=$PATH' >> '$USER_HOME/.bashrc' && \
    source $USER_HOME/.bashrc && \
    npm cache -g clean --force && \
    npm ci --cache=$NPM_CACHE"

# Install Cypress and additional NodeJS packages globally
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    npm install --prefix=$NPM_CACHE -g \
    cypress \
    junit-report-merger"

# Export NPM and Cypress Cache directories (to be accessible by rootless user)
ENV NPM_CONFIG_CACHE $NPM_CACHE
ENV CYPRESS_CACHE_FOLDER $CYPRESS_CACHE

# Set up environment variables for tools
ENV DISPLAY=:99
ENV OCM_CLI="$OCM_CLI"

# Label the Image
LABEL io.opendatahub.component="odh-cypress" \
      io.k8s.display-name="odh-cypress" \
      name="open-data-hub/odh-cypress" \
      summary="odh-cypress" \
      description="Image for Running Cypress Tests for Open Data Hub Dashboard"
