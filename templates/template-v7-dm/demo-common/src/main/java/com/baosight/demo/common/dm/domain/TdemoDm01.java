package com.baosight.demo.common.dm.domain;

import com.baosight.iplat4j.core.data.DaoEPBase;
import com.baosight.iplat4j.core.ei.EiColumn;
import com.baosight.iplat4j.core.util.StringUtils;

import java.util.HashMap;
import java.util.Map;

public class TdemoDm01 extends DaoEPBase {

    private String demoId = "";
    private String demoName = "";

    public TdemoDm01() {
        initMetaData();
    }

    public void initMetaData() {
        EiColumn column = new EiColumn("demoId");
        column.setPrimaryKey(true);
        column.setFieldLength(64);
        column.setDescName("主键");
        eiMetadata.addMeta(column);

        column = new EiColumn("demoName");
        column.setFieldLength(255);
        column.setDescName("名称");
        eiMetadata.addMeta(column);
    }

    public void fromMap(Map map) {
        setDemoId(StringUtils.defaultIfEmpty(StringUtils.toString(map.get("demoId")), demoId));
        setDemoName(StringUtils.defaultIfEmpty(StringUtils.toString(map.get("demoName")), demoName));
    }

    public Map toMap() {
        Map map = new HashMap();
        map.put("demoId", StringUtils.toString(demoId, eiMetadata.getMeta("demoId")));
        map.put("demoName", StringUtils.toString(demoName, eiMetadata.getMeta("demoName")));
        return map;
    }

    public String getDemoId() {
        return demoId;
    }

    public void setDemoId(String demoId) {
        this.demoId = demoId;
    }

    public String getDemoName() {
        return demoName;
    }

    public void setDemoName(String demoName) {
        this.demoName = demoName;
    }
}

