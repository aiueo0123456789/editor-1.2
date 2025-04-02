import os

# 検索するディレクトリ（適宜変更）
directory = "./docs/script/wgsl"

name_cache = {}

js_code = ""
# フォルダ内のすべてのファイルを再帰的に処理
for root, dirs, files in os.walk(directory):
    for file in files:
        file_path = os.path.join(root, file)
        if file.endswith(".wgsl"):
            # print(file_path)
            with open(file_path, "r", encoding="utf-8") as f:
                js_code += f"// {file}\n"
                js_code += f"export const {os.path.splitext(file)[0]} = `{f.read()}`\n"
# print(jsFile)
# .jsの作成
filename = "shader.js"
filepath = os.path.join(directory, filename)  # フルパスを作成
with open(filepath, "w", encoding="utf-8") as f:
    f.write(js_code)

print("output.js を作成しました！")