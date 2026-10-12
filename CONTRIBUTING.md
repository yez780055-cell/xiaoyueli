# 开发与发布流程

## 分支与 Pull Request

- `main` 是唯一正式生产分支。所有改动从最新的 `origin/main` 创建独立分支：
  - 新功能：`feature/<简短名称>`
  - 修复：`fix/<简短名称>`
  - 工程维护：`chore/<简短名称>`
- 不直接在 `main` 上提交或推送。所有变更通过目标分支为 `main` 的 Pull Request 合入。
- PR 必须通过 `CI / verify`，其中包含类型检查、测试和生产构建。
- 每个 PR 必须填写改动摘要、验证结果、风险、发布影响及本地数据兼容性。
- 禁止启用自动合并。完成审查和报告后，必须等待用户明确确认，再由用户决定是否合并。
- CI 及 Pages 工作流不得读取、上传或记录真实用户的本地健康数据、密码、密钥或备份。

常用流程：

```sh
git fetch origin
git switch -c feature/<简短名称> origin/main
npm ci
npm run typecheck
npm test
npm run build
git push -u origin feature/<简短名称>
```

然后在 GitHub 创建指向 `main` 的 PR。修复分支使用 `fix/<简短名称>`。合并前更新到最新 main 并重新通过 CI。

## 生产部署

正式网站只由 `.github/workflows/deploy.yml` 中的 `push` 到 `main` 事件部署。部署目标为 GitHub Pages。功能、修复及维护分支只运行 CI，不发布正式网站；部署工作流没有手动触发入口。

## 本地数据兼容性要求

浏览器本地存储属于用户健康数据，发布和回滚都必须保留其兼容性。当前持久化标识为：

- IndexedDB 数据库：`xiaoyueli-local`，版本 `1`
- Object store：`app-state`，主键为 `key`，根记录键为 `root`
- localStorage 降级键：`xiaoyueli-state-v1`
- 根数据包含 `periods` 与 `settings`

除非变更确有必要，不要重命名数据库、对象仓库、根键、localStorage 键或现有字段。新增字段必须有默认值和旧数据归一化逻辑。需要迁移时，应采用非破坏性、可重入的 IndexedDB 升级，并让新旧版本在迁移窗口内都能读取已有数据；不要在应用升级或回滚时清库、重置记录或降级数据库版本。任何存储或备份格式变更都要覆盖旧数据读取、迁移失败恢复、备份导入导出及回滚的测试。CI 只使用隔离的自动化测试数据，不接触用户设备上的本地记录。

Git 回滚只恢复代码，不会也不应自动清除浏览器中的 IndexedDB/localStorage。若某次变更涉及持久化格式，回滚前必须确认旧版代码仍能读取已升级的数据。

## 回滚

已发布改动通过新的 revert PR 撤销，保留完整历史；禁止对 `main` 使用 reset、改写历史或强制推送。

单个提交（包括 squash merge 生成的提交）：

```sh
git fetch origin
git switch -c fix/revert-<pr-number> origin/main
git revert <commit-sha>
git push -u origin fix/revert-<pr-number>
```

若需要撤销一个 merge commit：

```sh
git revert -m 1 <merge-commit-sha>
```

为该 revert 分支创建 PR，填写风险及数据兼容性说明，通过 CI 并等待用户明确确认后再合并。合并到 main 后，Pages 会按正常流程部署回滚版本。保留稳定基线 tag 作为定位和核对恢复版本的参考；优先使用 revert PR，而不是直接重置到 tag。
