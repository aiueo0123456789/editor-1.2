import os

# 検索するディレクトリ（適宜変更）
directory = "./docs"

name_cache = {}

js_code = "export const shaders = new Map()\n"
# フォルダ内のすべてのファイルを再帰的に処理
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".wgsl"):
            # print(file_path)
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, directory)  # directory からの相対パスを取得
            with open(file_path, "r", encoding="utf-8") as f:
                js_code += f"// {file}\n"
                # js_code += f"shaders.set({os.path.splitext(file)[0]},`{f.read()}`)\n"
                js_code += f"shaders.set('./{rel_path}',`{f.read()}`)\n"
# print(jsFile)
# .jsの作成
filename = "shader.js"
filepath = os.path.join(directory, filename)  # フルパスを作成
with open(filepath, "w", encoding="utf-8") as f:
    f.write(js_code)

print("output.js を作成しました！")