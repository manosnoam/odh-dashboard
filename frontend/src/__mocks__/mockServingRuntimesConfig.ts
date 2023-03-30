import { ConfigMapKind } from '~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
};

export const mockServingRuntimesConfig = ({
  name = 'servingruntimes-config',
  namespace = 'test-project',
}: MockResourceConfigType): ConfigMapKind => ({
  kind: 'ConfigMap',
  apiVersion: 'v1',
  metadata: {
    name,
    namespace,
    labels: {
      app: 'odh-dashboard',
      'app.kubernetes.io/part-of': 'odh-dashboard',
    },
  },
  data: {
    'default-config':
      "apiVersion: serving.kserve.io/v1alpha1\nkind: ServingRuntime\nmetadata:\n  # metadata will be overwritten by the model's metadata\n  name: ''\n  namespace: ''\n  labels:\n    name: ''\n    opendatahub.io/dashboard: 'true'\n  annotations: {}\nspec:\n  supportedModelFormats:\n    - name: openvino_ir\n      version: opset1\n      autoSelect: true\n    - name: onnx\n      version: '1'\n      autoSelect: true\n  # replicas will be overwritten by the model's replica\n  replicas: 1\n  protocolVersions:\n    - grpc-v1\n  multiModel: true\n  grpcEndpoint: 'port:8085'\n  grpcDataEndpoint: 'port:8001'\n  containers:\n    - name: ovms\n      image: >-\n        registry.redhat.io/rhods/odh-openvino-servingruntime-rhel8@sha256:7ef272bc7be866257b8126620e139d6e915ee962304d3eceba9c9d50d4e79767\n      args:\n        - '--port=8001'\n        - '--rest_port=8888'\n        - '--config_path=/models/model_config_list.json'\n        - '--file_system_poll_wait_seconds=0'\n        - '--grpc_bind_address=127.0.0.1'\n        - '--rest_bind_address=127.0.0.1'\n      resources:\n        # resources will be overwritten by the model's resource\n        requests:\n          cpu: 1\n          memory: 2\n        limits:\n          cpu: 1\n          memory: 2\n  builtInAdapter:\n    serverType: ovms\n    runtimeManagementPort: 8888\n    memBufferBytes: 134217728\n    modelLoadingTimeoutMillis: 90000\n",
    'servingruntimes_config.yaml':
      'kind: ConfigMap\napiVersion: v1\nmetadata:\n  name: servingruntimes_config\ndata:\n  mlserver-0.x.yaml: |\n    # Copyright 2021 IBM Corporation\n    #\n    # Licensed under the Apache License, Version 2.0 (the "License");\n    # you may not use this file except in compliance with the License.\n    # You may obtain a copy of the License at\n    #\n    #     http://www.apache.org/licenses/LICENSE-2.0\n    #\n    # Unless required by applicable law or agreed to in writing, software\n    # distributed under the License is distributed on an "AS IS" BASIS,\n    # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n    # See the License for the specific language governing permissions and\n    # limitations under the License.\n    apiVersion: serving.kserve.io/v1alpha1\n    kind: ServingRuntime\n    metadata:\n      name: mlserver-0.x\n      labels:\n        name: modelmesh-serving-mlserver-0.x-SR\n    spec:\n      supportedModelFormats:\n        - name: sklearn\n          version: "0" # v0.23.1\n          autoSelect: true\n        - name: xgboost\n          version: "1" # v1.1.1\n          autoSelect: true\n        - name: lightgbm\n          version: "3" # v3.2.1\n          autoSelect: true\n\n      multiModel: true\n\n      grpcEndpoint: "port:8085"\n      grpcDataEndpoint: "port:8001"\n\n      containers:\n        - name: mlserver\n          image: quay.io/opendatahub/mlserver:0.5.2\n          env:\n            - name: MLSERVER_MODELS_DIR\n              value: "/models/_mlserver_models/"\n            - name: MLSERVER_GRPC_PORT\n              value: "8001"\n            # default value for HTTP port is 8080 which conflicts with MMesh\'s\n            # Litelinks port\n            - name: MLSERVER_HTTP_PORT\n              value: "8002"\n            - name: MLSERVER_LOAD_MODELS_AT_STARTUP\n              value: "false"\n            # Set a dummy model name via environment so that MLServer doesn\'t\n            # error on a RepositoryIndex call when no models exist\n            - name: MLSERVER_MODEL_NAME\n              value: dummy-model-fixme\n            # Set server addr to localhost to ensure MLServer only listen inside the pod\n            - name: MLSERVER_HOST\n              value: "127.0.0.1"\n            # Increase gRPC max message size to 16 MiB to support larger payloads\n            - name: MLSERVER_GRPC_MAX_MESSAGE_LENGTH\n              value: "16777216"\n          resources:\n            requests:\n              cpu: 500m\n              memory: 1Gi\n            limits:\n              cpu: "5"\n              memory: 1Gi\n      builtInAdapter:\n        serverType: "mlserver"\n        runtimeManagementPort: 8001\n        memBufferBytes: 134217728\n        modelLoadingTimeoutMillis: 90000\n  triton-2.x.yaml: |\n    # Copyright 2021 IBM Corporation\n    #\n    # Licensed under the Apache License, Version 2.0 (the "License");\n    # you may not use this file except in compliance with the License.\n    # You may obtain a copy of the License at\n    #\n    #     http://www.apache.org/licenses/LICENSE-2.0\n    #\n    # Unless required by applicable law or agreed to in writing, software\n    # distributed under the License is distributed on an "AS IS" BASIS,\n    # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n    # See the License for the specific language governing permissions and\n    # limitations under the License.\n    apiVersion: serving.kserve.io/v1alpha1\n    kind: ServingRuntime\n    metadata:\n      name: triton-2.x\n      labels:\n        name: modelmesh-serving-triton-2.x-SR\n      annotations:\n        maxLoadingConcurrency: "2"\n    spec:\n      supportedModelFormats:\n        - name: keras\n          version: "2" # 2.6.0\n          autoSelect: true\n        - name: onnx\n          version: "1" # 1.5.3\n          autoSelect: true\n        - name: pytorch\n          version: "1" # 1.8.0a0+17f8c32\n          autoSelect: true\n        - name: tensorflow\n          version: "1" # 1.15.4\n          autoSelect: true\n        - name: tensorflow\n          version: "2" # 2.3.1\n          autoSelect: true\n        - name: tensorrt\n          version: "7" # 7.2.1\n          autoSelect: true\n\n      multiModel: true\n\n      grpcEndpoint: "port:8085"\n      grpcDataEndpoint: "port:8001"\n\n      containers:\n        - name: triton\n          image: nvcr.io/nvidia/tritonserver:21.06.1-py3\n          command: [/bin/sh]\n          args:\n            - -c\n            - \'mkdir -p /models/_triton_models;\n              chmod 777 /models/_triton_models;\n              exec tritonserver\n              "--model-repository=/models/_triton_models"\n              "--model-control-mode=explicit"\n              "--strict-model-config=false"\n              "--strict-readiness=false"\n              "--allow-http=true"\n              "--allow-sagemaker=false"\n              \'\n          resources:\n            requests:\n              cpu: 500m\n              memory: 1Gi\n            limits:\n              cpu: "5"\n              memory: 1Gi\n          livenessProbe:\n            # the server is listening only on 127.0.0.1, so an httpGet probe sent\n            # from the kublet running on the node cannot connect to the server\n            # (not even with the Host header or host field)\n            # exec a curl call to have the request originate from localhost in the\n            # container\n            exec:\n              command:\n                - curl\n                - --fail\n                - --silent\n                - --show-error\n                - --max-time\n                - "9"\n                - http://localhost:8000/v2/health/live\n            initialDelaySeconds: 5\n            periodSeconds: 30\n            timeoutSeconds: 10\n      builtInAdapter:\n        serverType: "triton"\n        runtimeManagementPort: 8001\n        memBufferBytes: 134217728\n        modelLoadingTimeoutMillis: 90000\n',
  },
});