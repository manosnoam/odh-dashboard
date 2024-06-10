FROM quay.io/fedora/nodejs-20:latest

ARG USER=cypress
ARG CHROME=https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
ARG OCP_CLI=https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux.tar.gz

USER root

# The user ID set to match the one used in Jenkins and avoid permissions issues during job execution
RUN mkdir -p /"$USER" \
    && adduser "$USER" \
    && chown -R "$USER" /"$USER"

WORKDIR /"$USER"

# Install tools including Xvfb and Chrome
RUN dnf install --nodocs -y \
    wget \
    unzip \
    xz \
    jq \
    xorg-x11-server-Xvfb \
    gtk2-devel \
    gtk3-devel \
    libnotify-devel \
    GConf2 \
    libXScrnSaver \
    "$CHROME"
    # nodejs \
    # curl \
    # gzip \
    # vim \
    # git \
    # nss \
    # alsa-lib \

# Clean cache
RUN dnf clean all \
    && rm -rf /var/cache/yum

# Install OCP client
RUN wget -qO- "$OCP_CLI" | tar zxv -C /usr/local/bin/ oc kubectl

# Install NodeJS packages for Dashboard
RUN npm install -g npm@latest
COPY ./frontend/package*.json ./
RUN npm install

# Label the Image
LABEL io.opendatahub.component="odh-dashboard" \
      io.k8s.display-name="odh-dashboard" \
      name="open-data-hub/odh-dashboard-ubi8" \
      summary="odh-dashboard" \
      description="Open Data Hub Dashboard"

# Switch to cypress user
USER $USER
