<%@ page contentType="text/html; charset=UTF-8" %>
<%@ taglib prefix="EF" tagdir="/WEB-INF/tags/EF" %>
<EF:EFPage title="Demo页面">
    <EF:EFRegion id="inqu" title="查询条件">
        <EF:EFInput blockId="inqu_status" ename="demoId" cname="主键" row="0"/>
        <EF:EFInput blockId="inqu_status" ename="demoName" cname="名称" row="0"/>
    </EF:EFRegion>
    <EF:EFRegion id="result" title="查询结果">
        <EF:EFGrid blockId="result" autoDraw="false" toolbarConfig="true">
            <EF:EFColumn ename="demoId" cname="主键"/>
            <EF:EFColumn ename="demoName" cname="名称"/>
        </EF:EFGrid>
    </EF:EFRegion>
</EF:EFPage>

