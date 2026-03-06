package com.baosight.demo.dm.service;

import com.baosight.demo.common.dm.domain.TdemoDm01;
import com.baosight.iplat4j.core.ei.EiInfo;
import com.baosight.iplat4j.core.service.impl.ServiceBase;

public class ServiceDMDEMO01 extends ServiceBase {

    @Override
    public EiInfo initLoad(EiInfo inInfo) {
        return query(inInfo);
    }

    @Override
    public EiInfo query(EiInfo inInfo) {
        return super.query(inInfo, "DMDEMO01.query", new TdemoDm01());
    }

    @Override
    public EiInfo insert(EiInfo inInfo) {
        return super.insert(inInfo, "DMDEMO01.insert");
    }

    @Override
    public EiInfo update(EiInfo inInfo) {
        return super.update(inInfo, "DMDEMO01.update");
    }

    @Override
    public EiInfo delete(EiInfo inInfo) {
        return super.delete(inInfo, "DMDEMO01.delete");
    }
}

