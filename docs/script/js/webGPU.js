import { vec2 } from "./ベクトル計算.js";

export function IsString(value) {
    return typeof value === "string" || value instanceof String;
}

class WebGPU {
    constructor() {
        this.structures = new Map();
        this.groupLayouts = new Map();
    }

    getGroupLayout(groupLayout) {
        let result = this.groupLayouts.get(groupLayout);
        if (result) {
            return result;
        } else {
            const items = [];
            for (const item of groupLayout.split("_")) {
                const useShaderTypes = item[0];
                const type = item.slice(1);
                if (useShaderTypes === "V") {
                    items.push({useShaderTypes: ["v"], type: type});
                } else if (useShaderTypes === "F") {
                    items.push({useShaderTypes: ["f"], type: type});
                } else if (useShaderTypes === "C") {
                    items.push({useShaderTypes: ["c"], type: type});
                }
            }
            result = this.createGroupLayout(items);
            this.groupLayouts.set(result);
            return result;
        }
    }

    codeToStructures() {

    }

    setBaseStruct(code) {
        const allReplace = (strings, targetStrings, newStrings = "") => {
            let checkString = "";
            let result = "";
            for (const string of strings) {
                if (checkString.length >= targetStrings.length) {
                    if (checkString == targetStrings) {
                        result += newStrings;
                    } else {
                        result += checkString[0];
                    }
                    checkString = checkString.slice(1) + string;
                } else {
                    checkString += string;
                }
            }
            if (checkString != targetStrings) {
                result += checkString[0];
            }
            return result;
        }
        function extractBetween(text, start, end) {
            const regex = new RegExp(`${start}(.*?)${end}`, "g");
            return [...text.matchAll(regex)].map(match => match[1]);
        }
        const getStructNameFromString = (strings) => {
            return extractBetween(strings, "struct ", "{")[0];
        }
        let structures = code.split("struct "); // 型宣言で分割
        structures.splice(0,1); // 先頭の空文字を削除
        structures.forEach(text => {
            const startIndex = text.indexOf("{");
            const endIndex = text.indexOf("}");
            if (startIndex > endIndex) {
                console.warn("}が{の前にあります",text);
                return "";
            }
            text = allReplace(text,"\n");
            text = allReplace(text," ");
            text = "struct " + text;
            this.structures.set(getStructNameFromString(text), text);
        })
        console.log(this.structures);
    }

    // バッファの書き換え
    writeBuffer(target, data, offset = 0) {
        device.queue.writeBuffer(target, offset ,data);
    }

    // シェーダモデルの作成
    createShaderModule(code, label = code) {
        return device.createShaderModule({ label: label, code: code });
    }

    // ビットデータの作成
    createBitData(array, struct) {
        const bufferLength = array.length / struct.filter(x => x != "padding").length;
        const buffer = new ArrayBuffer(bufferLength * struct.length * 4);
        const view = new DataView(buffer);

        let offset = 0;
        let index = 0;
        for (let i = 0; i < bufferLength;i ++) {
            for (const bitType of struct) {
                if (bitType == "u8") {
                    view.setUint8(offset, array[index], true);
                    index ++;
                    offset ++;
                } else if (bitType == "u32") {
                    view.setUint32(offset, array[index], true);
                    index ++;
                    offset += 4;
                } else if (bitType == "f32") {
                    view.setFloat32(offset, array[index], true);
                    index ++;
                    offset += 4;
                } else if (bitType == "padding") {
                    view.setFloat32(offset, 1, true);
                    offset += 4;
                }
            }
        }

        return new Uint8Array(buffer);
    }

    // ユニフォームバッファの作成
    createUniformBuffer(size, data = undefined, struct = ["f32"]) {
        if (data) {
            const buffer = device.createBuffer({
                size: size,
                usage: GPUBufferUsage.UNIFORM,
                mappedAtCreation: true,
            });
            new Uint8Array(buffer.getMappedRange()).set(this.createBitData(data, struct));
            buffer.unmap();
            return buffer;
        } else {
            return device.createBuffer({
                size: size,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            });
        }
    }

    // ストレージバッファの作成
    createStorageBuffer(size, data = undefined, struct = ["f32"]) {
        if (data) {
            const buffer = device.createBuffer({
                size: size,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true,
            });
            new Uint8Array(buffer.getMappedRange()).set(this.createBitData(data, struct));
            buffer.unmap();
            return buffer;
        } else {
            return device.createBuffer({
                size: size,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            });
        }
    }

    // バーテックスバッファの作成
    createVertexBuffer(size, data = undefined, struct = ["f32"]) {
        if (data) {
            const buffer = device.createBuffer({
                size: size,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
                mappedAtCreation: true,
            });
            new Uint8Array(buffer.getMappedRange()).set(this.createBitData(data, struct));
            buffer.unmap();
            return buffer;
        } else {
            return device.createBuffer({
                size: size,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            });
        }
    }

    createTextureSampler() {
        return device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
        });
    }

    createDepthTexture2D(size) {
        return device.createTexture({
            size: size,
            format: 'depth32float',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    createTexture2D(size, textureFormat = format) {
        return device.createTexture({
            size: size,
            format: textureFormat,
            // alphaMode: 'premultiplied', // または必要に応じて 'unpremultiplied'
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    createStorageTexture2D(size, textureFormat = format) {
        return device.createTexture({
            size: size,
            format: textureFormat,
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });
    }

    async imageToTexture2D(imagePath) {
        const image = new Image();
        const imagePromise = new Promise((resolve, reject) => {
            image.onload = () => resolve(image);
            image.onerror = (e) => reject(e);
        });
        image.src = imagePath;
        const img = await imagePromise;

        if (!(img instanceof HTMLImageElement)) {
            throw new TypeError('Loaded image is not an instance of HTMLImageElement.');
        }

        const resultTexture = this.createTexture2D([img.width,img.height,1],"rgba8unorm");

        device.queue.copyExternalImageToTexture(
            { source: img},
            { texture: resultTexture, origin: [0, 0, 0] },
            [img.width,img.height,1]
        );

        return resultTexture;
    }

    async imageFileToTexture2D(file, option = "背景色白") {
        if (option == "背景色白") {
            // ファイルからImageBitmapを作成
            const imageBitmap = await createImageBitmap(file);
            // テクスチャのサイズ情報
            const textureWidth = imageBitmap.width;
            const textureHeight = imageBitmap.height;
            // テクスチャを作成
            const s_texture = this.createStorageTexture2D([textureWidth,textureHeight],"rgba8unorm");
            const texture = this.createTexture2D([textureWidth,textureHeight],"rgba8unorm");
            // imageBitmapからGPUテクスチャにコピー
            device.queue.copyExternalImageToTexture(
                { source: imageBitmap },
                { texture: texture },
                { width: textureWidth, height: textureHeight }
            );
            imageBitmap.close();
            // コマンドエンコーダーを作成
            const commandEncoder = device.createCommandEncoder();
            const computePassEncoder = commandEncoder.beginComputePass();
            computePassEncoder.setPipeline(transparentToWhitePipeline);
            computePassEncoder.setBindGroup(0, GPU.createGroup(transparentToWhitePipeline.getBindGroupLayout(0), [s_texture, texture]));
            computePassEncoder.dispatchWorkgroups(Math.ceil(textureWidth / 16), Math.ceil(textureHeight / 16), 1); // ワークグループ数をディスパッチ
            computePassEncoder.end();
            // ストレージテクスチャを通常のテクスチャにコピー
            commandEncoder.copyTextureToTexture(
                { texture: s_texture },
                { texture: texture },
                { width: textureWidth, height: textureHeight }
            );
            // コマンドを実行
            device.queue.submit([commandEncoder.finish()]);
            // imageBitmapを解放（メモリ効率のため）
            return { texture: texture, width: textureWidth, height: textureHeight };
        } else {
            // ファイルからImageBitmapを作成
            const imageBitmap = await createImageBitmap(file);
            // テクスチャのサイズ情報
            const textureWidth = imageBitmap.width;
            const textureHeight = imageBitmap.height;
            // テクスチャを作成
            const texture = this.createTexture2D([textureWidth,textureHeight],"rgba8unorm");
            // imageBitmapからGPUテクスチャにコピー
            device.queue.copyExternalImageToTexture(
                { source: imageBitmap },
                { texture: texture },
                { width: textureWidth, height: textureHeight }
            );
            // imageBitmapを解放（メモリ効率のため）
            imageBitmap.close();
            console.log(await this.getTextureData(texture));
            return { texture: texture, width: textureWidth, height: textureHeight };

        }
    }

    async imagesToSkyBoxTextures(imagePaths) {
        const promises = [
            "left+X.png",
            "right-X.png",
            "up+Y.png",
            "down-Y.png",
            "front+Z.png",
            "back-Z.png",
        ].map(async (src) => {
            const response = await fetch(imagePaths + src);
            return createImageBitmap(await response.blob());
        });
        const imageBitmaps = await Promise.all(promises);

        const cubemapTexture = device.createTexture({
            dimension: '2d',
            size: [imageBitmaps[0].width, imageBitmaps[0].height, 6],
            format: format,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        for (let i = 0; i < imageBitmaps.length; i++) {
            const imageBitmap = imageBitmaps[i];
            device.queue.copyExternalImageToTexture(
                { source: imageBitmap },
                { texture: cubemapTexture, origin: [0, 0, i] },
                [imageBitmap.width, imageBitmap.height, 1]
            );
        }

        return cubemapTexture;
    }

    // グループレイアウトの作成
    createGroupLayout(items) {
        function entrieFromType(type) {
            if (type == 'u') {
                return {
                    buffer: {
                        type: 'uniform', // 'read-only-storage'で読みだけ可能なストレージバッファにする
                    },
                };
            }
            if (type == 'srw') {
                return {
                    buffer: {
                        type: 'storage', // 'storage' を使って、ストレージバッファを指定
                        readOnly: false, // 読み書き可能に設定
                    },
                };
            }
            if (type == 'sr') {
                return {
                    buffer: {
                        type: 'read-only-storage', // 'read-only-storage'で読みだけ可能なストレージバッファにする
                    },
                };
            }
            if (type == 't') {
                return {
                    texture: {
                        sampleType: 'float'
                    },
                };
            }
            if (type == 'ct') {
                return {
                    texture: {
                        viewDimension: "cube",
                    },
                };
            }
            if (type == 'ts') {
                return {
                    sampler: {
                        type: 'filtering',
                    },
                };
            }
            if (type == "str") {
                return {
                    storageTexture: {
                        access: 'read-only',
                        format: 'rgba8unorm',
                        viewDimension: '2d',
                    },
                }
            }
            if (type == "stw") {
                return {
                    storageTexture: {
                        access: 'write-only',
                        format: 'rgba8unorm',
                        viewDimension: '2d',
                    },
                }
            }
            if (type == "strw") {
                return {
                    storageTexture: {
                        access: 'read-write',
                        format: 'rgba8unorm',
                        viewDimension: '2d',
                    },
                }
            }

            console.warn(`グループレイアウトのリソースの振り分けに問題がありました。\n無効なtype[${type}]`);
        }

        function stageFromType(useShaderTypes) {
            // GPUShaderStage のマッピング
            const shaderStageMap = {
                v: GPUShaderStage.VERTEX,    // vertex
                f: GPUShaderStage.FRAGMENT, // fragment
                c: GPUShaderStage.COMPUTE,  // compute
            };

            // 初期値は 0
            let visibility = 0;

            // 指定された配列をループしてビットマスクを生成
            for (const type of useShaderTypes) {
                if (shaderStageMap[type]) {
                    visibility |= shaderStageMap[type];
                } else {
                    console.warn(`グループレイアウトのシェーダーに可視性を示す値に問題がありました。\n無効なtype[${type}]`);
                }
            }

            return visibility;
        }

        return device.createBindGroupLayout({
            entries: items.map((x,i) => {
                return Object.assign({
                        binding: i, // インプットオブジェクトデータ
                        visibility: stageFromType(x.useShaderTypes)
                    },
                    entrieFromType(x.type)
                )
            })
        });
    }

    // グループの作成
    createGroup(groupLayout, items) {
        function entrieFromType(type, item) {
            if (!type) {
                if (item instanceof GPUBuffer) {
                    type = "b";
                } else if (item instanceof GPUTexture) {
                    item = item.createView();
                    type = "t";
                } else if (item instanceof GPUTextureView) {
                    type = "t";
                } else {
                    console.warn("無効",item);
                }
            }
            if (type == 'b') {
                if (!item.size) {
                    return {
                        log: item,
                        error: "bufferのサイズが有効な値ではありません",
                    };
                }
                return {
                    resource: {
                        buffer: item,
                    }
                };
            }
            if (type == 't') {
                return {
                    resource: item,
                };
            }
            if (type == 'ts') {
                return {
                    resource: item,
                };
            }
            if (type == 'ct') {
                return {
                    resource: item,
                };
            }
            console.warn(`グループのリソースの振り分けに問題がありました。\n無効なtype[${type}]関連付けられたitem[${item}]`);
        }

        return device.createBindGroup({
            layout: groupLayout,
            entries: items.map((x,i) => {
                let entrie;
                if (Array.isArray(x)) {
                    entrie = entrieFromType(x[1], x[0]);
                } else if (x.type) {
                    entrie = entrieFromType(x.type, x.item);
                } else {
                    entrie = entrieFromType(null, x);
                }
                if (entrie.error) {
                    console.error(entrie.log);
                    throw Error(entrie.error + `index: ${i}`);
                }
                return Object.assign({
                        binding: i, // インプットオブジェクトデータ
                    },
                    entrie
                )
            })
        });
    }

    // コンピューターパイプラインの作成
    createComputePipeline(groupLayouts, c) {
        if (IsString(c)) {
            c = this.createShaderModule(c);
        }
        return device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: groupLayouts,
            }),
            compute: {
                module: c,
                entryPoint: 'main',
            },
        });
    }

    appendDataToStorageBuffer(buffer, data) {
        const newBuffer = GPU.createStorageBuffer(buffer.size + (data.length * 4), undefined, ["f32"]);
        GPU.copyBuffer(buffer, newBuffer);
        GPU.writeBuffer(newBuffer, data, buffer.size);
        return newBuffer;
    }

    appendDataToVertexBuffer(buffer, data) {
        const newBuffer = GPU.createVertexBuffer(buffer.size + (data.length * 4), undefined, ["f32"]);
        GPU.copyBuffer(buffer, newBuffer);
        GPU.writeBuffer(newBuffer, data, buffer.size);
        return newBuffer;
    }

    deleteIndexsToBuffer(buffer, indexs, structOffset) {
        const dataNum = buffer.size / structOffset;
        indexs.sort((a,b) => a - b);
        const startAndEndIndexs = [];
        let lastIndex = 0;
        for (const subIndex of indexs) {
            if (subIndex - lastIndex >= 1) {
                startAndEndIndexs.push([lastIndex,subIndex - 1]);
            }
            lastIndex = subIndex + 1;
        }
        if (lastIndex < dataNum) {
            startAndEndIndexs.push([lastIndex,dataNum - 1]);
        }
        GPU.consoleBufferData(buffer, ["f32"], "old");
        const newBuffer = GPU.createStorageBuffer((buffer.size - indexs.length * structOffset), undefined, ["f32"]);
        let offset = 0;
        for (const rOffset of startAndEndIndexs) {
            console.log(rOffset[0] * structOffset, offset, (rOffset[1] - rOffset[0]) * structOffset)
            GPU.copyBuffer(buffer, newBuffer, rOffset[0] * structOffset, offset, (rOffset[1] - rOffset[0] + 1) * structOffset);
            offset += (rOffset[1] - rOffset[0] + 1) * structOffset;
        }
        GPU.consoleBufferData(newBuffer, ["f32"], "new");
        return newBuffer;
    }

    createRenderPipelineFromOneFile(groupLayouts, shader, vertexBufferStruct, option = "", topologyType = "t") {
        if (IsString(shader)) {
            shader = this.createShaderModule(shader);
        }
        let shaderLocationOffset = 0;
        const createBuffers = (struct) => {
            const structSize = struct.map(x => {
                if (x == "u") {
                    return 4;
                }
                if (x == "f") {
                    return 4;
                }
                if (x == "f_2") {
                    return 8;
                }
                if (x == "f_3") {
                    return 12;
                }
            });
            let offset = 0;
            return {
                arrayStride: structSize.reduce((sum, x) => {
                    return sum + x;
                },0),
                attributes: struct.map((x, i) => {
                    shaderLocationOffset ++;
                    let format = "float32";
                    if (x == "u") {
                        format = "uint32";
                    }
                    if (x == "f") {
                        format = "float32";
                    }
                    if (x == "f_2") {
                        format = "float32x2";
                    }
                    if (x == "f_3") {
                        format = "float32x3";
                    }
                    offset += structSize[i];
                    return {
                        shaderLocation: shaderLocationOffset - 1,
                        format: format,
                        offset: offset - structSize[i],
                    };
                })
            };
        }
        const vertexBuffers = vertexBufferStruct.map((x) => {
            return createBuffers(x);
        });
        if (option == "2d") {
            return device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: groupLayouts,
                }),
                vertex: {
                    module: shader,
                    entryPoint: 'vmain',
                    buffers: vertexBuffers,
                },
                fragment: {
                    module: shader,
                    entryPoint: 'fmain',
                    targets: [
                        {
                            // format: 'bgra8unorm',
                            // format: fragmentOutputFormat,
                            format: format,
                            blend: {
                                color: {
                                    srcFactor: 'src-alpha', // ソースのアルファ値
                                    dstFactor: 'one-minus-src-alpha', // 1 - ソースのアルファ値
                                    operation: 'add', // 加算
                                },
                                alpha: {
                                    srcFactor: 'src-alpha',
                                    dstFactor: 'one-minus-src-alpha',
                                    operation: 'add',
                                }
                            }
                        }
                    ],
                },
                primitive: {
                    // topology: 'triangle-list',
                    topology: topologyType == "t" ? 'triangle-list' : 'triangle-strip',
                },
            });
        }
    }

    // レンダーパイプラインの作成
    createRenderPipeline(groupLayouts, vShader, fShader, vertexBufferStruct, option = "", topologyType = "t") {
        if (IsString(vShader)) {
            vShader = this.createShaderModule(vShader);
        }
        if (IsString(fShader)) {
            fShader = this.createShaderModule(fShader);
        }
        let shaderLocationOffset = 0;
        const createBuffers = (struct) => {
            const structSize = struct.map(x => {
                if (x == "u") {
                    return 4;
                }
                if (x == "f") {
                    return 4;
                }
                if (x == "f_2") {
                    return 8;
                }
                if (x == "f_3") {
                    return 12;
                }
            });
            let offset = 0;
            return {
                arrayStride: structSize.reduce((sum, x) => {
                    return sum + x;
                },0),
                attributes: struct.map((x, i) => {
                    shaderLocationOffset ++;
                    let format = "float32";
                    if (x == "u") {
                        format = "uint32";
                    }
                    if (x == "f") {
                        format = "float32";
                    }
                    if (x == "f_2") {
                        format = "float32x2";
                    }
                    if (x == "f_3") {
                        format = "float32x3";
                    }
                    offset += structSize[i];
                    return {
                        shaderLocation: shaderLocationOffset - 1,
                        format: format,
                        offset: offset - structSize[i],
                    };
                })
            };
        }
        const vertexBuffers = vertexBufferStruct.map((x) => {
            return createBuffers(x);
        });
        if (option == "2d") {
            return device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: groupLayouts,
                }),
                vertex: {
                    module: vShader,
                    entryPoint: 'main',
                    buffers: vertexBuffers,
                },
                fragment: {
                    module: fShader,
                    entryPoint: 'main',
                    targets: [
                        {
                            // format: 'bgra8unorm',
                            // format: fragmentOutputFormat,
                            format: format,
                            blend: {
                                color: {
                                    srcFactor: 'src-alpha', // ソースのアルファ値
                                    dstFactor: 'one-minus-src-alpha', // 1 - ソースのアルファ値
                                    operation: 'add', // 加算
                                },
                                alpha: {
                                    srcFactor: 'src-alpha',
                                    dstFactor: 'one-minus-src-alpha',
                                    operation: 'add',
                                }
                            }
                        }
                    ],
                },
                primitive: {
                    // topology: 'triangle-list',
                    topology: topologyType == "t" ? 'triangle-list' : 'triangle-strip',
                },
            });
        } else if (option == "mask") {
            return device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: groupLayouts,
                }),
                vertex: {
                    module: vShader,
                    entryPoint: 'main',
                    buffers: vertexBuffers,
                },
                fragment: {
                    module: fShader,
                    entryPoint: 'main',
                    targets: [
                        {
                            format: 'r8unorm', // 出力フォーマットをr8unormに設定
                            blend: {
                                color: {
                                    srcFactor: 'src-alpha', // ソースの透明度
                                    dstFactor: 'one-minus-src-alpha', // 背景の透明度
                                    operation: 'add',
                                },
                                alpha: {
                                    srcFactor: 'one',
                                    dstFactor: 'one-minus-src-alpha',
                                    operation: 'add',
                                },
                            },
                            writeMask: GPUColorWrite.RED, // 赤チャネルのみ書き込み
                        },
                    ],
                },
                primitive: {
                    // topology: 'triangle-list',
                    topology: topologyType == "t" ? 'triangle-list' : 'triangle-strip',
                },
            });
        }else if (option == "cvsCopy") {
            return device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: groupLayouts,
                }),
                vertex: {
                    module: vShader,
                    entryPoint: 'main',
                    buffers: [],
                },
                fragment: {
                    module: fShader,
                    entryPoint: 'main',
                    targets: [
                        {
                            format: format,
                            blend: {
                                color: {
                                    srcFactor: 'src-alpha', // ソースのアルファ値
                                    dstFactor: 'one-minus-src-alpha', // 1 - ソースのアルファ値
                                    operation: 'add', // 加算
                                },
                                alpha: {
                                    srcFactor: 'src-alpha',
                                    dstFactor: 'one-minus-src-alpha',
                                    operation: 'add',
                                }
                            }
                        },
                    ],
                },
                primitive: {
                    topology: 'triangle-strip',
                },
            });
        }
    }

    // バッファをバッファにコピー
    copyBuffer(resource, copyTarget, resourceOffset = 0, targetOffset = 0, copySize = resource.size) {
        const copyCommandEncoder = device.createCommandEncoder();

        copyCommandEncoder.copyBufferToBuffer(
            resource,  // コピー元
            resourceOffset,        // コピー元のオフセット
            copyTarget,  // コピー先
            targetOffset,        // コピー先のオフセット
            copySize  // コピーするバイト数
        );

        const copyCommandBuffer = copyCommandEncoder.finish();
        device.queue.submit([copyCommandBuffer]);
    }

    copyBufferToNewBuffer(resource) {
        const newBuffer = this.createStorageBuffer(resource.size, undefined, ["f32"]);
        const copyCommandEncoder = device.createCommandEncoder();

        copyCommandEncoder.copyBufferToBuffer(
            resource,  // コピー元
            0,        // コピー元のオフセット
            newBuffer,  // コピー先
            0,        // コピー先のオフセット
            resource.size  // コピーするバイト数
        );

        const copyCommandBuffer = copyCommandEncoder.finish();
        device.queue.submit([copyCommandBuffer]);

        return newBuffer;
    }

    // コンピューターシェーダーの実行
    runComputeShader(pipeline, groups, workNumX = 1, workNumY = 1,workNumZ = 1) {
        if (workNumX < 1 || workNumY < 1 || workNumZ < 1) return ;
        const computeCommandEncoder = device.createCommandEncoder();
        const computePassEncoder = computeCommandEncoder.beginComputePass();
        computePassEncoder.setPipeline(pipeline);
        for (let i = 0; i < groups.length; i ++) {
            computePassEncoder.setBindGroup(i, groups[i]);
        }
        computePassEncoder.dispatchWorkgroups(workNumX,workNumY,workNumZ); // ワークグループ数をディスパッチ
        computePassEncoder.end();
        device.queue.submit([computeCommandEncoder.finish()]);
    }

    async copyBufferToArray(buffer, array) {
        // 一時的な読み取り用バッファを作成 (MAP_READ を含む)
        const readBuffer = device.createBuffer({
            size: array.length * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // コピーコマンドを発行
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, array.length * 4);
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);

        // 一時バッファの内容をマップして表示
        await readBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = new Float32Array(readBuffer.getMappedRange());
        for (let i = 0; i < array.length; i ++) {
            array[i] = mappedRange[i];
        }
        readBuffer.unmap();
    }

    async copyBBoxBufferToObject(BBoxBuffer, object) {
        const bufferByteLength = (2 * 2) * 4;
        // 一時的な読み取り用バッファを作成 (MAP_READ を含む)
        const readBuffer = device.createBuffer({
            size: bufferByteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // コピーコマンドを発行
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(BBoxBuffer, 0, readBuffer, 0, bufferByteLength);
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);

        // 一時バッファの内容をマップして表示
        await readBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = new Float32Array(readBuffer.getMappedRange());
        object.BBox.min = [mappedRange[0], mappedRange[1]];
        object.BBox.max = [mappedRange[2], mappedRange[3]];
        object.BBox.width = [mappedRange[2], mappedRange[3]];
        object.BBox.width = mappedRange[2] - mappedRange[0];
        object.BBox.height = mappedRange[3] - mappedRange[1];
        object.BBox.center = vec2.reverseScaleR(vec2.addR(object.BBox.min,object.BBox.max), 2);
        readBuffer.unmap();
    }

    async getBufferVerticesData(buffer) {
        const size = buffer.size;
        // 一時的な読み取り用バッファを作成 (MAP_READ を含む)
        const readBuffer = device.createBuffer({
            size: size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // コピーコマンドを発行
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, size);
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);

        // 一時バッファの内容をマップして表示
        await readBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = new Float32Array(readBuffer.getMappedRange());
        const dataArray = [];
        for (let i = 0; i < mappedRange.length; i += 2) {
            dataArray.push([mappedRange[i], mappedRange[i + 1]]);
        }

        readBuffer.unmap();
        return dataArray;
    }

    async getF32BufferPartsData(buffer, index, struct) {
        const size = struct * 4;
        // 一時的な読み取り用バッファを作成 (MAP_READ を含む)
        const readBuffer = device.createBuffer({
            size: size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // コピーコマンドを発行
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(buffer, index * struct * 4, readBuffer, 0, size);
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);

        // 一時バッファの内容をマップして表示
        await readBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = readBuffer.getMappedRange();
        const dataArray = new Float32Array(mappedRange.slice(0));

        readBuffer.unmap();
        readBuffer.destroy();  // ← 追加
        return dataArray;
    }

    async getF32BufferData(buffer, size) {
        if (!size) {
            size = buffer.size;
        }
        // 一時的な読み取り用バッファを作成 (MAP_READ を含む)
        const readBuffer = device.createBuffer({
            size: size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // コピーコマンドを発行
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, size);
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);

        // 一時バッファの内容をマップして表示
        await readBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = readBuffer.getMappedRange();
        const dataArray = new Float32Array(mappedRange.slice(0));

        readBuffer.unmap();
        readBuffer.destroy();  // ← 追加
        return dataArray;
    }

    async getU32BufferData(buffer, size) {
        if (!size) {
            size = buffer.size;
        }
        // 一時的な読み取り用バッファを作成 (MAP_READ を含む)
        const readBuffer = device.createBuffer({
            size: size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // コピーコマンドを発行
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, size);
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);

        // 一時バッファの内容をマップして表示
        await readBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = readBuffer.getMappedRange();
        const dataArray = new Uint32Array(mappedRange.slice(0));

        readBuffer.unmap();
        return dataArray;
    }

    async getBufferDataAsStruct(buffer, size, struct) {
        if (!size) {
            size = buffer.size;
        }
        // 一時的な読み取り用バッファを作成
        const readBuffer = device.createBuffer({
            size: size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // コピーコマンドを発行
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, size);
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);

        // 一時バッファの内容をマップ
        await readBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = readBuffer.getMappedRange();
        const rawData = new Uint8Array(mappedRange);

        // 構造体に基づいてデータを解析
        const dataView = new DataView(rawData.buffer);
        const structSize = struct.length * 4; // 各フィールドのサイズが 4 バイト固定 (u32, f32)
        const result = [];

        let offset = 0;
        for (let i = 0; i < size / structSize; i++) {
            for (const field of struct) {
                if (field === "u32") {
                    result.push(dataView.getUint32(offset, true));
                } else if (field === "f32") {
                    result.push(dataView.getFloat32(offset, true));
                }
                offset += 4; // フィールドのサイズを加算
            }
        }

        readBuffer.unmap();
        return result;
    }

    async consoleBufferData(buffer, struct, text = "", indexs = "all") {
        // 一時的な読み取り用バッファを作成 (MAP_READ を含む)
        const readBuffer = device.createBuffer({
            size: buffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // コピーコマンドを発行
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, buffer.size);
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);

        // 一時バッファの内容をマップして表示
        await readBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = readBuffer.getMappedRange();
        const rawData = new Uint8Array(mappedRange);

        // 構造体に基づいてデータを解析
        const dataView = new DataView(rawData.buffer);
        const structSize = struct.length * 4; // 各フィールドのサイズが 4 バイト固定 (u32, f32)
        const result = [];

        let offset = 0;
        if (indexs == "all") {
            for (let i = 0; i < buffer.size / structSize; i++) {
                for (const field of struct) {
                    if (field === "u32") {
                        result.push(dataView.getUint32(offset, true));
                    } else if (field === "f32") {
                        result.push(dataView.getFloat32(offset, true));
                    }
                    offset += 4; // フィールドのサイズを加算
                }
            }
        } else {
            let index = 0;
            for (let i = 0; i < buffer.size / structSize; i++) {
                for (const field of struct) {
                    if (indexs.includes(index)) {
                        if (field === "u32") {
                            result.push(dataView.getUint32(offset, true));
                        } else if (field === "f32") {
                            result.push(dataView.getFloat32(offset, true));
                        }
                    }
                    offset += 4; // フィールドのサイズを加算
                }
                index ++;
            }
        }

        readBuffer.unmap();
        console.log(text,result);
    }

    async createTextureAtlas(textures, textureSize) {
        // アトラステクスチャのサイズ計算
        const atlasRowCol = Math.ceil(Math.sqrt(textures.length));
        const atlasSize = atlasRowCol * textureSize;

        const atlasTexture = device.createTexture({
            size: [atlasSize, atlasSize],
            format: format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });

        // 各テクスチャをアトラスにコピー
        const commandEncoder = device.createCommandEncoder();
        textures.forEach((texture, index) => {
            const x = (index % atlasRowCol) * textureSize;
            const y = Math.floor(index / atlasRowCol) * textureSize;

            commandEncoder.copyTextureToTexture(
                { texture },
                { texture: atlasTexture, origin: { x, y } },
                [textureSize, textureSize, 1]
            );
        });

        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);

        return [atlasTexture, atlasRowCol];
    }

    decompression(data, t) {
        function base64ToU32_U8Array(base64) {
            // Base64文字列をデコードしてバイナリ文字列に変換
            try {
                const binaryString = atob(base64);
                // バイナリ文字列をUint8Arrayに変換
                const uint8Array = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                }

                const dataView = new DataView(uint8Array.buffer);

                const zeroNum = dataView.getUint32(0, true);
                const result = new Uint8Array(zeroNum + dataView.byteLength - 4);
                for (let i = 0; i < zeroNum; i ++) {
                    result[i] = 0;
                }
                for (let i = 0; i < dataView.byteLength - 4; i ++) {
                    result[zeroNum + i] = dataView.getUint8(4 + i, true);
                }
                return result;
            } catch {
                // バイナリ文字列をUint8Arrayに変換
                throw Error(base64);
            }
        }

        function base64ToU8Array(base64) {
            // Base64文字列をデコードしてバイナリ文字列に変換
            try {
                const binaryString = atob(base64);
                // バイナリ文字列をUint8Arrayに変換
                const uint8Array = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                }
                return uint8Array;
            } catch {
                // バイナリ文字列をUint8Arrayに変換
                throw Error(base64);
            }
        }

        // Base64文字列をImageBitmapに変換
        const type = data[0];
        // const type = "1";
        const sectionData = data.slice(1).split("_");
        // const sectionData = data.split("_");
        let offset = 0;
        if (type == "1") {
            for (const base64 of sectionData) {
                const uint8Array = base64ToU32_U8Array(base64);
                t.set(uint8Array, offset);
                offset += uint8Array.byteLength;
            }
        } else {
            const colorTableBit = base64ToU8Array(sectionData[0]);
            const colorTable = [];
            for (let i = 0; i < colorTableBit.length; i += 4) {
                colorTable.push([colorTableBit[i],colorTableBit[i + 1],colorTableBit[i + 2],colorTableBit[i + 3]]);
            }

            for (const base64 of sectionData.slice(1)) {
                const uint8Array = base64ToU32_U8Array(base64);
                const colorArray = new Uint8Array(uint8Array.length * 4);
                for (let i = 0; i < colorArray.length; i += 4) {
                    if (colorTable[uint8Array[i / 4]]) {
                        colorArray.set(colorTable[uint8Array[i / 4]], i);
                    } else {
                        colorArray.set([255,0,255,255], i);
                        console.warn("カラーテーブル以上のindexが見つかりました",uint8Array[i / 4],colorTable.length);
                    }
                }
                t.set(colorArray, offset);
                offset += colorArray.byteLength;
            }
        }
    }

    compression(data, type = "1") {
        function toBase64(bit) {
            let binaryString = "";
            for (let i = 0; i < bit.length; i++) {
                binaryString += String.fromCharCode(bit[i]);
            }
            return btoa(binaryString);
        }
        function datasToBase64(data) {
            let strings = [];
            for (const bit of data) {
                strings.push(toBase64(bit));
            }
            return strings.join("_");
        }

        let result = [];

        const appendBitData = (zeroNum, data) => {
            const buffer = new ArrayBuffer(4 + data.length); // u32, u8...
            const view = new DataView(buffer);
            view.setUint32(0, zeroNum, true);
            for (let i = 0; i < data.length; i ++) {
                view.setUint8(4 + i, data[i], true);
            }
            result.push(new Uint8Array(buffer));
        }

        if (type == "1") {
            let b = data;
            // 圧縮1(前との差)
            // let b = new Uint8Array(data.length);
            // b[0] = data[0];
            // for (let i = 1; i < data.length; i ++) {
            //     b[i] = numberToUint8(data[i] - data[i - 1]);
            // }
            // return dataToBase64(data);

            let arrayData = [];

            let i = 0;
            while (i < b.length) {
                let zeroNum = 0;
                while (b[i] == 0 && i < b.length) {
                    zeroNum ++;
                    i ++;
                }
                const arrayData = [];
                while (b[i] != 0 && i < b.length) {
                    arrayData.push(b[i]);
                    i ++;
                }
                appendBitData(zeroNum,arrayData);
            }
            arrayData.length = 0;
            return "1" + datasToBase64(result);
        } else if (type == "2") {
            let tableIndex = data.tableIndex;
            let colorTable = toBase64(new Uint8Array(data.colorTable));

            const b = new Uint8Array(tableIndex);
            // const b = new Uint8Array(tableIndex.length);
            // b[0] = tableIndex[0];
            // for (let i = 1; i < tableIndex.length; i ++) {
            //     b[i] = tableIndex[i] - tableIndex[i - 1];
            // }

            let arrayData = [];
            let i = 0;
            while (i < b.length) {
                let zeroNum = 0;
                while (b[i] == 0 && i < b.length) {
                    zeroNum ++;
                    i ++;
                }
                const arrayData = [];
                while (b[i] != 0 && i < b.length) {
                    arrayData.push(b[i]);
                    i ++;
                }
                appendBitData(zeroNum,arrayData);
            }
            arrayData.length = 0;
            return "2" + colorTable + "_" + datasToBase64(result);
        }
    }

    async textureToBase64(texture, option = true) {
        const alignedBytesPerRow = Math.ceil((texture.width * 4) / 256) * 256;
        const stagingBuffer = device.createBuffer({
            size: alignedBytesPerRow * texture.height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            { texture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { buffer: stagingBuffer, bytesPerRow: alignedBytesPerRow, rowsPerImage: texture.height },
            { width: texture.width, height: texture.height, depthOrArrayLayers: 1 }
        );
        device.queue.submit([commandEncoder.finish()]);

        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = stagingBuffer.getMappedRange();
        const uint8Array = new Uint8Array(arrayBuffer);

        function getColorHash(c) {
            return c[0] * 255 ** 3 +
                   c[1] * 255 ** 2 +
                   c[2] * 255 +
                   c[3];
        }

        const colorTable = [];
        const tableIndex = [];
        const colorHashs = new Map();
        for (let i = 0; i < uint8Array.length; i += 4) {
            const color = uint8Array.slice(i, i + 4);
            const hash = getColorHash(color);
            if (!colorHashs.has(hash)) { // カラーテーブルに記録されていない色を記録
                colorHashs.set(hash, colorTable.length / 4); // hashとtableIndexを記録
                colorTable.push(...color); // テーブルを追加
            }
            tableIndex.push(colorHashs.get(hash)); // ピクセルのテーブルindexを取得
            if (option) {
                if (uint8Array[i + 3] == 0) { // 透明度だった場合
                    for (let j = 0; j < 3; j ++) {
                        uint8Array[i + j] = 0;
                    }
                }
            }
        }

        let base64String;
        if (colorTable.length / 4 >= 257) { // テーブルの数が257以上の場合
            base64String = this.compression(uint8Array);
        } else {
            base64String = this.compression({tableIndex: tableIndex, colorTable: colorTable},"2");
        }
        stagingBuffer.unmap();
        return {data: base64String, width: texture.width, height: texture.height}; // "data:image/png;base64,..." の形式で返される
    }

    copyBase64ToTexture(texture, base64String, option = "背景色白") {
        const alignedBytesPerRow = Math.ceil((texture.width * 4) / 256) * 256;

        // Base64文字列をImageBitmapに変換
        const pixelData = new Uint8Array(alignedBytesPerRow * texture.height);
        this.decompression(base64String, pixelData);
        // if (offset != alignedBytesPerRow * texture.height) {
        //     console.warn("テクスチャデータの破損が見つかりました", offset, alignedBytesPerRow * texture.height);
        // }

        // 2. GPUバッファを作成
        const buffer = device.createBuffer({
            size: alignedBytesPerRow * texture.height,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        });
        // 3. バッファにUint8Arrayのデータをセット
        device.queue.writeBuffer(buffer, 0, pixelData);
        // 4. コマンドエンコーダーの作成
        const commandEncoder = device.createCommandEncoder();
        // 5. テクスチャへのコピーコマンド
        commandEncoder.copyBufferToTexture(
            {
                buffer: buffer,
                offset: 0,
                bytesPerRow: alignedBytesPerRow, // 1行あたりのバイト数
                rowsPerImage: texture.height,
            },
            {
                texture: texture,
                mipLevel: 0,
                origin: { x: 0, y: 0, z: 0 },
            },
            { width: texture.width, height: texture.height, depthOrArrayLayers: 1 }
        );
        if (option == "背景色白") {
            const s_texture = this.createStorageTexture2D([texture.width,texture.height],"rgba8unorm");
            const computePassEncoder = commandEncoder.beginComputePass();
            computePassEncoder.setPipeline(transparentToWhitePipeline);
            computePassEncoder.setBindGroup(0, GPU.createGroup(transparentToWhitePipeline.getBindGroupLayout(0), [s_texture, texture]));
            computePassEncoder.dispatchWorkgroups(Math.ceil(texture.width / 16), Math.ceil(texture.height / 16), 1); // ワークグループ数をディスパッチ
            computePassEncoder.end();
            // ストレージテクスチャを通常のテクスチャにコピー
            commandEncoder.copyTextureToTexture(
                { texture: s_texture },
                { texture: texture },
                { width: texture.width, height: texture.height }
            );
        }
        // 6. コマンドの実行
        device.queue.submit([commandEncoder.finish()]);
    }

    async getTextureData(texture) {
        const alignedBytesPerRow = Math.ceil((texture.width * 4) / 256) * 256;
        const stagingBuffer = device.createBuffer({
            size: alignedBytesPerRow * texture.height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            { texture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { buffer: stagingBuffer, bytesPerRow: alignedBytesPerRow, rowsPerImage: texture.height },
            { width: texture.width, height: texture.height, depthOrArrayLayers: 1 }
        );
        device.queue.submit([commandEncoder.finish()]);

        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = stagingBuffer.getMappedRange();
        const uint8Array = new Uint8Array(arrayBuffer);

        const r = uint8Array.slice();
        stagingBuffer.unmap();
        return r;
    }

    async checkT(texture1, texture2) {
        const t1 = await this.getTextureData(texture1);
        const t2 = await this.getTextureData(texture2);

        for (let i = 0; i < t1.length; i += 4) {
            let c1 = [t1[i] * t1[i + 3], t1[i + 1] * t1[i + 3], t1[i + 2] * t1[i + 3]];
            let c2 = [t2[i] * t2[i + 3], t2[i + 1] * t2[i + 3], t2[i + 2] * t2[i + 3]];

            // for (let j = 0; j < 3; j ++) {
            //     if (c1[j] != c2[j]) {
            //         console.log(c1, c2, i)
            //         console.log(t1.slice(i - 12, i + 12));
            //         console.log(t2.slice(i - 12, i + 12));
            //         return false;
            //     }
            // }
            for (let j = 0; j < 3; j ++) {
                if (c1[j] != 0) {
                    console.log(c1, c2, i)
                    return false;
                }
            }
        }
        return true;
    }

    // async copyBase64ToTexture(texture, base64String) {
    //     if (!base64String.startsWith("data:image/")) {
    //         // プレフィックスを自動的に追加（例: PNG形式として処理）
    //         base64String = "data:image/png;base64," + base64String;
    //     }

    //     // Base64文字列をImageBitmapに変換
    //     const image = await createImageBitmap(await fetch(base64String).then(res => res.blob()));

    //     // ImageBitmapのサイズがテクスチャに合うか確認
    //     if (image.width !== texture.width || image.height !== texture.height) {
    //         throw new Error("Image size does not match the texture size.");
    //     }

    //     // コマンドエンコーダを作成してデータをコピー
    //     device.queue.copyExternalImageToTexture(
    //         { source: image },
    //         { texture: texture },
    //         {
    //             width: image.width,
    //             height: image.height,
    //             depthOrArrayLayers: 1,
    //         }
    //     );

    //     base64String = null;
    //     image.close();
    // }
}

if ('gpu' in navigator) {
    console.log("WebGPU is supported!");
} else {
    console.log("WebGPU is NOT supported.");
}

const adapter = await navigator.gpu.requestAdapter();

export const device = await adapter.requestDevice();

export const format = navigator.gpu.getPreferredCanvasFormat();

const blendState = {
    color: {
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha",
        operation: "add"
    },
    alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha",
        operation: "add"
    }
};

// {
//     color: {
//         srcFactor: 'src-alpha', // ソースのアルファ値
//         dstFactor: 'one-minus-src-alpha', // 1 - ソースのアルファ値
//         operation: 'add', // 加算
//     },
//     alpha: {
//         srcFactor: 'src-alpha',
//         dstFactor: 'one-minus-src-alpha',
//         operation: 'add',
//     }
// }

export const GPU = new WebGPU();
const transparentToWhitePipeline = GPU.createComputePipeline(
    [GPU.createGroupLayout([{useShaderTypes: ['c'], type: 'stw'},{useShaderTypes: ['c'], type: 't'}])],
    `
    @group(0) @binding(0) var modifyTexture : texture_storage_2d<rgba8unorm, write>;
    @group(0) @binding(1) var image : texture_2d<f32>;
    @compute @workgroup_size(16, 16)
    fn main(@builtin(global_invocation_id) id : vec3<u32>) {
        let size = textureDimensions(modifyTexture);
        if (id.x >= size.x || id.y >= size.y) {
            return;
        }
        // 現在のピクセルの色を取得
        var color: vec4<f32> = textureLoad(image, vec2<i32>(id.xy),0);
        // α値が 0 の場合、白色に置き換え
        if (color.a == 0.0) {
            textureStore(modifyTexture, vec2<i32>(id.xy), vec4<f32>(1.0, 1.0, 1.0, 0.0));
        } else {
            textureStore(modifyTexture, vec2<i32>(id.xy), color);
        }
    }
    `
);


// console.log(
//     GPU.decompression(GPU.compression([
//         0,0,0,0,255,255,255,255,
//         0,0,200,200,150,150,150,
//         255,0,200,200,150,150,150,
//     ]))
// )